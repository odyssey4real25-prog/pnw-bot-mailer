// /recruit template create/list/edit/delete - manage recruitment message templates
// /recruit auto on/off - turn automatic new-nation recruiting on or off
// /recruit status - see current auto-recruit settings and stats

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recruit')
    .setDescription('Recruitment automation settings')
    .addSubcommandGroup((group) =>
      group
        .setName('template')
        .setDescription('Manage recruitment message templates')
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a new recruitment template')
            .addStringOption((opt) =>
              opt.setName('id').setDescription('Short unique ID, e.g. "friendly1"').setRequired(true)
            )
            .addStringOption((opt) =>
              opt.setName('subject').setDescription('Mail subject line').setRequired(true)
            )
            .addStringOption((opt) =>
              opt
                .setName('body')
                .setDescription('Message body. Use {nation_name} and {leader_name} as placeholders.')
                .setRequired(true)
            )
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('List all saved templates'))
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Delete a template')
            .addStringOption((opt) =>
              opt.setName('id').setDescription('Template ID to delete').setRequired(true)
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('auto')
        .setDescription('Turn automatic new-nation recruiting on or off')
        .addStringOption((opt) =>
          opt
            .setName('state')
            .setDescription('on or off')
            .setRequired(true)
            .addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' })
        )
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('Show auto-recruit status and stats')),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // ---------- /recruit template ... ----------
    if (group === 'template') {
      if (sub === 'create') {
        const id = interaction.options.getString('id').toLowerCase().replace(/\s+/g, '-');
        const subject = interaction.options.getString('subject');
        const body = interaction.options.getString('body');

        if (db.getTemplate(id)) {
          return interaction.reply({
            content: `❌ A template with ID "${id}" already exists. Delete it first or use a different ID.`,
            ephemeral: true,
          });
        }

        db.addTemplate(id, { name: id, subject, body });
        return interaction.reply({
          content: `✅ Template "${id}" created. It will now be included in the random rotation for new-nation recruiting.`,
          ephemeral: true,
        });
      }

      if (sub === 'list') {
        const templates = db.getAllTemplates();
        if (templates.length === 0) {
          return interaction.reply({
            content:
              'No templates yet. Create one with `/recruit template create`. You need at least one template before auto-recruit will send anything.',
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('📋 Recruitment Templates')
          .setColor(0x9b59b6)
          .setDescription(
            templates
              .map((t) => `**${t.id}**\nSubject: ${t.subject}\nBody: ${t.body.slice(0, 150)}${t.body.length > 150 ? '...' : ''}`)
              .join('\n\n')
          );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (sub === 'delete') {
        const id = interaction.options.getString('id').toLowerCase().replace(/\s+/g, '-');
        const existed = db.deleteTemplate(id);
        return interaction.reply({
          content: existed ? `✅ Template "${id}" deleted.` : `❌ No template found with ID "${id}".`,
          ephemeral: true,
        });
      }
    }

    // ---------- /recruit auto on|off ----------
    if (sub === 'auto') {
      const state = interaction.options.getString('state');
      const enabled = state === 'on';

      if (enabled && db.getAllTemplates().length === 0) {
        return interaction.reply({
          content:
            '❌ You need at least one recruitment template before turning auto-recruit on. Use `/recruit template create` first.',
          ephemeral: true,
        });
      }

      db.setSetting('autoRecruitEnabled', enabled);
      return interaction.reply({
        content: enabled
          ? '✅ Auto-recruit is now **ON**. New nations will be mailed automatically every few minutes.'
          : '🛑 Auto-recruit is now **OFF**. New nations will no longer be mailed automatically.',
        ephemeral: true,
      });
    }

    // ---------- /recruit status ----------
    if (sub === 'status') {
      const enabled = Boolean(db.getSetting('autoRecruitEnabled'));
      const templateCount = db.getAllTemplates().length;
      const recruitCount = db.getAllRecruits().length;

      const embed = new EmbedBuilder()
        .setTitle('🎯 Recruitment Status')
        .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
        .addFields(
          { name: 'Auto-Recruit', value: enabled ? '✅ ON' : '🛑 OFF', inline: true },
          { name: 'Templates Saved', value: String(templateCount), inline: true },
          { name: 'Total Recruits Tracked', value: String(recruitCount), inline: true }
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
