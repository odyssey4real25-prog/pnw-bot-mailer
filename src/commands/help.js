// /help
// Lists every command the bot currently has, built automatically from the
// loaded command files. You never need to edit this file when new commands
// are added in later phases - it reads the live command list at the moment
// someone runs /help.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

/**
 * Turns a single slash command's data into a readable block of text,
 * including its subcommands/subcommand groups and their options.
 */
function describeCommand(command) {
  const json = command.data.toJSON();
  const lines = [];

  const subcommands = [];
  const groups = [];

  for (const opt of json.options || []) {
    if (opt.type === 1) {
      // SUB_COMMAND
      subcommands.push(opt);
    } else if (opt.type === 2) {
      // SUB_COMMAND_GROUP
      groups.push(opt);
    }
  }

  if (subcommands.length === 0 && groups.length === 0) {
    // Simple command with no subcommands - just show its own options.
    const optionList = (json.options || [])
      .map((o) => `${o.required ? '' : '[optional] '}${o.name}`)
      .join(', ');
    lines.push(`\`/${json.name}${optionList ? ' ' + optionList : ''}\` — ${json.description}`);
    return lines.join('\n');
  }

  for (const sub of subcommands) {
    const optionList = (sub.options || [])
      .map((o) => `${o.required ? '' : '[optional] '}${o.name}`)
      .join(' ');
    lines.push(`\`/${json.name} ${sub.name}${optionList ? ' ' + optionList : ''}\` — ${sub.description}`);
  }

  for (const group of groups) {
    for (const sub of group.options || []) {
      const optionList = (sub.options || [])
        .map((o) => `${o.required ? '' : '[optional] '}${o.name}`)
        .join(' ');
      lines.push(
        `\`/${json.name} ${group.name} ${sub.name}${optionList ? ' ' + optionList : ''}\` — ${sub.description}`
      );
    }
  }

  return lines.join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available bot commands'),

  async execute(interaction) {
    const commands = [...interaction.client.commands.values()].sort((a, b) =>
      a.data.name.localeCompare(b.data.name)
    );

    const embed = new EmbedBuilder()
      .setTitle('📖 PnW Recruitment Bot — Commands')
      .setColor(0x3498db)
      .setDescription(
        'This list always reflects exactly what the bot can currently do.'
      );

    for (const command of commands) {
      embed.addFields({
        name: `/${command.data.name}`,
        value: describeCommand(command) || command.data.description,
      });
    }

    return interaction.reply({ embeds: [embed], flags: 64 });
  },
};
