import { joinRole, leaveRole, removeMember, setStatus, getPartyByMessage } from '../partyManager.js';
import { buildPartyEmbed, buildRoleButtons, buildHostButtons } from '../embedBuilder.js';
import { createSalaryThread } from '../threadManager.js';
import { buildRemoveMemberMenu } from "../components/removeMemberMenu.js";

export const name = 'interactionCreate';

// tombol host-only
const HOST_ONLY = new Set(['party_lock', 'party_done', 'party_cancel_run', 'party_remove_member']);

export async function execute(interaction, client) {
  // ── Slash commands ──────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const msg = { content: '❌ Terjadi error.', ephemeral: true };
      interaction.replied ? interaction.followUp(msg) : interaction.reply(msg);
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    if (!interaction.customId.startsWith("party_remove_select_")) return;
const messageId = interaction.customId.replace(
    "party_remove_select_",
    ""
);
const party = getPartyByMessage(messageId);
    if (!party) {
        return interaction.reply({
            content: "❌ Party tidak ditemukan.",
            ephemeral: true
        });
    }
    const userId = interaction.values[0];
    const result = removeMember(
        messageId,
        interaction.user.id,
        userId
    );

    if (!result.ok)
        return interaction.reply({
            content: result.reason,
            ephemeral: true
        });
    await refreshMessage(
        interaction,
        result.party
    );
        return interaction.reply({
        content: "✅ Member removed.",
        ephemeral: true,
        });
}

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

  // ── Remove member (host only) ──────────────────────────────────────────────
  if (customId === "party_remove_member") {
    if (user.id !== party.hostId) {
        return interaction.reply({
            content: "❌ Only the host can remove members.",
            ephemeral: true
        });
    }
    const menu = buildRemoveMemberMenu(party);

    if (!menu) {
      return interaction.reply({
        content: "❌ There are no members that can be removed.",
        ephemeral: true,
      });
    }
    return interaction.reply({
      content: "Choose a member to remove.",
      components: [menu],
      ephemeral: true,
    });
}

  // ── Done (host only) ────────────────────────────────────────────────────────
  if (customId === 'party_done') {
  if (user.id !== party.hostId) {
    return interaction.reply({
      content: '❌ Hanya host yang bisa menutup party.',
      ephemeral: true,
    });
  }
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
  return interaction.reply({
    content: 'horee Party selesai & thread salary udh dibuat.',
    ephemeral: true,
  });

}

  // ── Cancel Run (host only) ──────────────────────────────────────────────────
  if (customId === 'party_cancel_run') {
    const updated = setStatus(message.id, 'cancelled');
    await refreshMessage(interaction, updated, true);
    return interaction.reply({ content: '🚫 Run dibatalkan.', ephemeral: true });
  }
}

async function refreshMessage(interaction, party, disableAll = false) {
  const isDone =
    party.status === "done" ||
    party.status === "cancelled";

  const channel = await interaction.client.channels.fetch(party.channelId);

  const message = await channel.messages.fetch(party.messageId);

  await message.edit({
    embeds: [buildPartyEmbed(party)],
    components:
      isDone || disableAll
        ? []
        : [...buildRoleButtons(), buildHostButtons(party.status)],
  });
}
