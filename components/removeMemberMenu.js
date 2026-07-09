import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

import { ROLES } from "../config.js";

export function buildRemoveMemberMenu(party) {
  const options = [];

  for (const role of ROLES) {
    const members = party.members[role.id] ?? [];

    for (const member of members) {

      // Jangan tampilkan host di dropdown
      if (member.userId === party.hostId) continue;
      options.push({
        label: member.username,
        description: role.label,
        value: member.userId,
        emoji: role.emoji,
      });
    }
  }

  // biar tidak mengizinkan dropdown tanpa option
  if (options.length === 0) {
    return null;
  }
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`party_remove_select_${party.messageId}`) 
      .setPlaceholder("Choose member to remove")
      .addOptions(options)
  );
}