// /mail send nation:<id OR name OR link> subject:"..." message:"..."
// Sends real in-game mail through the PnW API and logs it in Discord + the database.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pnw = require('../pnwApi');
const db = require('../database');
const { getOrCreateRecruitThread } = require('../utils/threads');
const { resolveNation } = require('../utils/resolveNation');
const { truncateForDiscord } = require('../utils/discordText');
const { canSendRecruitmentMail } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mail')
    .setDescription('In-game mail bridge')
    .addSubcommand((sub) =>
      sub
        .setName('send')
        .setDescription('Send in-game mail to a nation')
        .addStringOption((opt) =>
          opt
            .setName('nation')
            .setDescription('Nation ID, nation name, or profile link')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('subject').setDescription('Mail subject').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('message').setDescription('Mail message').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('history')
        .setDescription('View mail history with a nation')
        .addStringOption((opt) =>
          opt
            .setName('nation')
            .setDescription('Nation ID, nation name, or profile link')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'send') {
      if (!canSendRecruitmentMail(interaction)) {
        return interaction.reply({
          content: '❌ You don\'t have permission to send recruitment mail. Ask an admin about the recruiter role.',
          flags: 64,
        });
      }

      await interaction.deferReply({ flags: 64 });

      const nationInput = interaction.options.getString('nation');
      const subject = interaction.options.getString('subject');
      const message = interaction.options.getString('message');

      let nation;
      try {
        nation = await resolveNation(nationInput);
      } catch (err) {
        return interaction.editReply(`❌ Could not look up that nation: ${err.message}`);
      }

      if (!nation) {
        return interaction.editReply(
          `❌ No nation found matching "${nationInput}". Check the spelling, ID, or link.`
        );
      }

      const nationId = nation.id;

      if (db.isBlacklisted(nationId)) {
        const entry = db.getBlacklistEntry(nationId);
        return interaction.editReply(
          `🚫 ${nation.nation_name} (#${nationId}) is on the blacklist${entry?.reason ? ` (reason: ${entry.reason})` : ''}. ` +
            `If you're sure you want to mail them anyway, remove them from the blacklist first with \`/blacklist remove\`.`
        );
      }

      const personalKey = db.getPersonalApiKey(interaction.user.id);

      try {
        await pnw.sendMail(nationId, subject, message, personalKey);
      } catch (err) {
        return interaction.editReply(`❌ Failed to send mail: ${err.message}`);
      }

      // Log to database
      db.addMailLog({
        nationId,
        direction: 'outgoing',
        subject,
        message,
        sentBy: interaction.user.id,
      });
      db.touchLastContacted(nationId);
      db.setInitialAttributionIfMissing(nationId, null, interaction.user.id);

      // Post into the recruit's dedicated thread
      const thread = await getOrCreateRecruitThread(
        interaction.client,
        nationId,
        nation.nation_name
      );

      const embed = new EmbedBuilder()
        .setTitle('📨 MAIL SENT')
        .addFields(
          { name: 'Nation', value: `${nation.nation_name} (#${nationId})` },
          { name: 'Subject', value: subject },
          { name: 'Sent By', value: `<@${interaction.user.id}>` }
        )
        .setColor(0x3498db)
        .setTimestamp();

      await thread.send({ embeds: [embed] });
      await thread.send({ content: truncateForDiscord(message, '**Message:**\n') });

      return interaction.editReply(
        `✅ Mail sent to ${nation.nation_name} (#${nationId}) from ${personalKey ? 'your own nation' : 'the alliance\'s shared nation'}. See ${thread}.`
      );
    }

    if (sub === 'history') {
      await interaction.deferReply({ flags: 64 });
      const nationInput = interaction.options.getString('nation');

      let nation;
      try {
        nation = await resolveNation(nationInput);
      } catch (err) {
        return interaction.editReply(`❌ Could not look up that nation: ${err.message}`);
      }

      if (!nation) {
        return interaction.editReply(
          `❌ No nation found matching "${nationInput}". Check the spelling, ID, or link.`
        );
      }

      const rows = db.getMailLog(nation.id);

      if (rows.length === 0) {
        return interaction.editReply(`No mail history found for ${nation.nation_name} (#${nation.id}).`);
      }

      const lines = rows.map((row) => {
        const who = row.direction === 'outgoing' ? `Staff <@${row.sent_by}>` : 'Recruit';
        return `**[${row.created_at}] ${who} (${row.direction})**\n*${row.subject}*\n${row.message}\n`;
      });

      // Discord messages have a 2000 character limit - trim if needed
      let text = lines.join('\n');
      if (text.length > 1900) text = text.slice(0, 1900) + '\n...(truncated)';

      return interaction.editReply(text);
    }
  },
};
