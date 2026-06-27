// /config recruiter-role set/clear - Admin-only. Controls who is allowed to
// use the mail-sending commands (/mail send, /recruit bulk).

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Bot configuration (Administrator only)')
    .addSubcommandGroup((group) =>
      group
        .setName('recruiter-role')
        .setDescription('Control who can send recruitment mail through the bot')
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Only Administrators and this role can use /mail send and /recruit bulk')
            .addRoleOption((opt) => opt.setName('role').setDescription('The recruiter role').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName('clear').setDescription('Remove the restriction - everyone can send recruitment mail again')
        )
        .addSubcommand((sub) => sub.setName('status').setDescription('Show the current recruiter role setting'))
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ You need Administrator permission to use this.', flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const role = interaction.options.getRole('role');
      db.setRecruiterRoleId(role.id);
      return interaction.reply({
        content: `✅ Only Administrators and members with the **${role.name}** role can now use \`/mail send\` and \`/recruit bulk\`.`,
        flags: 64,
      });
    }

    if (sub === 'clear') {
      db.setRecruiterRoleId(null);
      return interaction.reply({
        content: '✅ Recruiter role restriction removed. Everyone can use `/mail send` and `/recruit bulk` again.',
        flags: 64,
      });
    }

    if (sub === 'status') {
      const roleId = db.getRecruiterRoleId();
      return interaction.reply({
        content: roleId
          ? `Current recruiter role: <@&${roleId}> (plus Administrators)`
          : 'No recruiter role set - everyone can currently use `/mail send` and `/recruit bulk`.',
        flags: 64,
      });
    }
  },
};
