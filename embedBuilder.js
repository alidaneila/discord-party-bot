import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { ROLES, MAX_PARTY_SIZE } from './config.js';
import { totalMembers } from './partyManager.js';

export function buildPartyEmbed(party) {
  const filled = totalMembers(party);
  const statusColor =
    party.status === 'open'      ? 0x5865F2 :
    party.status === 'locked'    ? 0xFEE75C :
    party.status === 'done'      ? 0x57F287 :
                                   0xED4245;

  const statusLabel =
    party.status === 'open'      ? '🟢 Open' :
    party.status === 'locked'    ? '🔒 Locked' :
    party.status === 'done'      ? '✅ Done' :
                                   '❌ Cancelled';

  // Build role lines — show all slots individually for multi-slot roles
  const roleLines = ROLES.map(r => {
    const members = party.members[r.id] ?? [];
    if (r.maxSlot === 1) {
      const m = members[0];
      return `**${r.label}** — ${m ? `<@${m.userId}>` : '*empty*'}`;
    }
    // Multi-slot: show each slot
    const slots = Array.from({ length: r.maxSlot }, (_, i) => {
      const m = members[i];
      return m ? `<@${m.userId}>` : '*empty*';
    }).join(', ');
    return `**${r.label}** (${members.length}/${r.maxSlot}) — ${slots}`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(statusColor)
    .setTitle(`⚔️ ${party.title}`)
    .setDescription(roleLines)
    .addFields(
      { name: 'Host',   value: `<@${party.hostId}>`,       inline: true },
      { name: 'Slot',   value: `${filled}/${MAX_PARTY_SIZE}`, inline: true },
      { name: 'Status', value: statusLabel,                 inline: true },
    )
    .setTimestamp(party.createdAt)
    .setFooter({ text: 'Klik tombol role di bawah untuk join' });
}

export function buildRoleButtons(disabled = false) {
  const rows = [];
  for (let i = 0; i < ROLES.length; i += 4) {
    const row = new ActionRowBuilder();
    ROLES.slice(i, i + 4).forEach(r => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`role_${r.id}`)
          .setLabel(r.label)
          .setEmoji(r.emoji)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled),
      );
    });
    rows.push(row);
  }
  return rows;
}

export function buildHostButtons(partyStatus) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('party_cancel_role')
      .setLabel('Cancel My Role')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('party_lock')
      .setLabel(partyStatus === 'locked' ? 'Unlock Party' : 'Lock Party')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId('party_remove_member')
      .setLabel('Remove Member')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️'),
    new ButtonBuilder()
      .setCustomId('party_done')
      .setLabel('Done')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId('party_cancel_run')
      .setLabel('Cancel Run')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🚫'),
  );
  return row;
}
