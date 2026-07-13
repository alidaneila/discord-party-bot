import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { joinRole, leaveRole, removeMember, setStatus, getPartyByMessage, updateTitle, totalMembers } from '../partyManager.js';
import { buildPartyEmbed, buildRoleButtons, buildHostButtons } from '../embedBuilder.js';
import { createSalaryThread } from '../threadManager.js';
import { buildRemoveMemberMenu } from '../components/removeMemberMenu.js';
import { ROLES, MAX_PARTY_SIZE } from '../config.js';

export const name = 'interactionCreate';

// tombol host-only
const HOST_ONLY = new Set([
  'party_lock',
  'party_done',
  'party_cancel_run',
  'party_remove_member',
  'party_edit_title',
  'party_ping_again',
]);

export async function execute(interaction, client) {
  // ── Slash commands ──────────────────────────────────────────────────────────
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    }
  } catch (err) {
    console.error(err);

    const msg = {
      content: '❌ Terjadi error saat menjalankan command.',
      ephemeral: true,
    };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(msg);
  } else {
    await interaction.reply(msg);
  }
}

  // ── Modal submit ────────────────────────────────────────────────────────────
  if (interaction.isModalSubmit()) {
    if (!interaction.customId.startsWith('modal_edit_title_')) return;

    const messageId = interaction.customId.replace('modal_edit_title_', '');
    const newTitle = interaction.fields.getTextInputValue('new_title').trim();
    const party = getPartyByMessage(messageId);

    if (!party) return interaction.reply({ content: '❌ Party tidak ditemukan.', ephemeral: true });
    if (party.hostId !== interaction.user.id) return interaction.reply({ content: '❌ Hanya host yang bisa edit title.', ephemeral: true });

    const updated = updateTitle(messageId, newTitle);

    // Edit pesan party langsung — tanpa ping
    const channel = await interaction.client.channels.fetch(party.channelId);
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (msg) {
      await msg.edit({
        content: `@here | ⚔️ ${updated.title}`,
        embeds: [buildPartyEmbed(updated)],
        components: [...buildRoleButtons(), ...buildHostButtons(updated.status)],
        allowedMentions: { parse: [] }, // edit tanpa nge-ping ulang
      });
    }

    return interaction.reply({ content: `✏️ Judul diubah ke **${newTitle}**.`, ephemeral: true });
  }

  // ── Select menu (remove member) ─────────────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    if (!interaction.customId.startsWith('party_remove_select_')) return;

    const messageId = interaction.customId.replace('party_remove_select_', '');
    const party = getPartyByMessage(messageId);
    if (!party) {
      return interaction.reply({ content: '❌ Party tidak ditemukan.', ephemeral: true });
    }

    const userId = interaction.values[0];
    const result = removeMember(messageId, interaction.user.id, userId);
    if (!result.ok) return interaction.reply({ content: result.reason, ephemeral: true });

    await refreshMessage(interaction, result.party);
    return interaction.reply({ content: '✅ Member removed.', ephemeral: true });
  }

  // ── Button interactions ─────────────────────────────────────────────────────
  if (!interaction.isButton()) return;

  const { customId, message, user } = interaction;
  const party = getPartyByMessage(message.id);

  if (!party) {
    return interaction.reply({ content: '❌ Party tidak ditemukan.', ephemeral: true });
  }

  // Host-only gate
  if (HOST_ONLY.has(customId) && user.id !== party.hostId) {
    return interaction.reply({ content: '❌ Hanya host yang bisa menggunakan tombol ini.', ephemeral: true });
  }

  // ── Join role ───────────────────────────────────────────────────────────────
  if (customId.startsWith('role_')) {
    if (party.status !== 'open') {
      return interaction.reply({ content: '🔒 Party sudah dikunci.', ephemeral: true });
    }
    const roleId = customId.replace('role_', '');
    const result = joinRole(message.id, roleId, user.id, user.username);
    if (!result.ok) {
      return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
    }
    await refreshMessage(interaction, result.party);
    return interaction.reply({ content: `✅ Kamu join sebagai **${roleId}**!`, ephemeral: true });
  }

  // ── Cancel own role (anyone) ────────────────────────────────────────────────
  if (customId === 'party_cancel_role') {
    const result = leaveRole(message.id, user.id);
    if (!result.ok) {
      return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
    }
    await refreshMessage(interaction, result.party);
    return interaction.reply({ content: `↩️ Kamu keluar dari role **${result.roleLeft}**.`, ephemeral: true });
  }

  // ── Lock / Unlock (host only) ───────────────────────────────────────────────
  if (customId === 'party_lock') {
    const newStatus = party.status === 'locked' ? 'open' : 'locked';
    const updated = setStatus(message.id, newStatus);
    await refreshMessage(interaction, updated);
    const label = newStatus === 'locked' ? '🔒 Party dikunci!' : '🟢 Party dibuka kembali!';
    return interaction.reply({ content: label, ephemeral: true });
  }

  // ── Remove member (host only) ───────────────────────────────────────────────
  if (customId === 'party_remove_member') {
    const menu = buildRemoveMemberMenu(party);
    if (!menu) {
      return interaction.reply({ content: '❌ Tidak ada member yang bisa diremove.', ephemeral: true });
    }
    return interaction.reply({ content: 'Pilih member yang mau diremove:', components: [menu], ephemeral: true });
  }

  // ── Done (host only) ────────────────────────────────────────────────────────
  if (customId === 'party_done') {
    const updated = setStatus(message.id, 'done');
    await refreshMessage(interaction, updated, true);
    try {
      await createSalaryThread(client, updated);
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: `⚠️ Party selesai, tetapi gagal membuat thread salary.\n\n${err.message}`,
        ephemeral: true,
      });
    }
    return interaction.reply({ content: 'horee Party selesai & thread salary udh dibuat.', ephemeral: true });
  }

  // ── Cancel Run (host only) ──────────────────────────────────────────────────
  if (customId === 'party_cancel_run') {
    const updated = setStatus(message.id, 'cancelled');
    await refreshMessage(interaction, updated, true);
    return interaction.reply({ content: '🚫 Run dibatalkan.', ephemeral: true });
  }

  // ── Edit Title (host only) ──────────────────────────────────────────────────
  if (customId === 'party_edit_title') {
    const modal = new ModalBuilder()
      .setCustomId(`modal_edit_title_${message.id}`)
      .setTitle('Edit Judul Party');

    const titleInput = new TextInputBuilder()
      .setCustomId('new_title')
      .setLabel('Judul baru')
      .setStyle(TextInputStyle.Short)
      .setValue(party.title)
      .setMaxLength(80)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
    return interaction.showModal(modal);
  }

  // ── Ping Again (host only) ──────────────────────────────────────────────────
  if (customId === 'party_ping_again') {
    const filled = totalMembers(party);

    const neededRoles = ROLES
      .filter(r => (party.members[r.id]?.length ?? 0) < r.maxSlot)
      .map(r => r.label);

    const needText = neededRoles.length > 0
      ? `Need: ${neededRoles.join(' / ')}`
      : 'Hampir penuh!';

    const partyUrl = `https://discord.com/channels/${interaction.guildId}/${party.channelId}/${party.messageId}`;

    await interaction.channel.send({
      content: `@here ⚔️ **${party.title}** • ${filled}/${MAX_PARTY_SIZE} • ${needText}\n${partyUrl}`,
      allowedMentions: { parse: ['everyone'] },
    });

    return interaction.reply({ content: '📣 Notif terkirim!', ephemeral: true });
  }
}

async function refreshMessage(interaction, party, disableAll = false) {
  const isDone = party.status === 'done' || party.status === 'cancelled';

  const channel = await interaction.client.channels.fetch(party.channelId);
  const message = await channel.messages.fetch(party.messageId);

  await message.edit({
    embeds: [buildPartyEmbed(party)],
    components: isDone || disableAll
      ? []
      : [...buildRoleButtons(), ...buildHostButtons(party.status)],
  });
}
