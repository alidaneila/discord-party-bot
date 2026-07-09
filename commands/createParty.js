import { SlashCommandBuilder } from 'discord.js';
import { createParty } from '../partyManager.js';
import { buildPartyEmbed, buildRoleButtons, buildHostButtons } from '../embedBuilder.js';

export const data = new SlashCommandBuilder()
  .setName('createparty')
  .setDescription('Buat party baru kamu akan jadi host')
  .addStringOption(opt =>
    opt.setName('title')
      .setDescription('Judul party (contoh: GDN HC)')
      .setRequired(true),
  );

export async function execute(interaction) {
  const title = interaction.options.getString('title');

  // Biar Discord tidak timeout
  await interaction.deferReply({
    ephemeral: true,
  });

  // Kirim pesan party ke channel (biar nge-ping @here)
  const partyMessage = await interaction.channel.send({
    content: `@here | ⚔️ ${title}`,
    allowedMentions: {
      parse: ['everyone'],
    },
    embeds: [],
    components: [],
  });

  // Simpan messageId dari pesan channel
  const party = createParty({
    messageId: partyMessage.id,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    hostName: interaction.member.displayName,
    title,
  });

  // Edit pesan channel menjadi embed
  await partyMessage.edit({
    content: `@here | ⚔️ ${party.title}`,
    embeds: [buildPartyEmbed(party)],
    components: [...buildRoleButtons(), buildHostButtons(party.status)],
  });

  // Hapus pesan "Bot is thinking..."
  await interaction.deleteReply();
}
