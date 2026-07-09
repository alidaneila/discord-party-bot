import { ChannelType } from 'discord.js';

export async function createSalaryThread(client, party) {
  const channelId = process.env.SALARY_CHANNEL_ID;

  if (!channelId) {
    throw new Error('SALARY_CHANNEL_ID belum diisi.');
  }

  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    throw new Error('Salary channel tidak ditemukan.');
  }

  if (channel.type !== ChannelType.GuildText) {
    throw new Error('Salary channel harus berupa Text Channel.');
  }

  const thread = await channel.threads.create({
    name: party.title,
    autoArchiveDuration: 1440, // 24 jam
    reason: `Party selesai: ${party.title}`,
  });

  const mentions = Object.values(party.members)
  .flat()
  .map(member => `<@${member.userId}>`)
  .join(' ');

await thread.send({
  content:
`🎉 Party completed!

${mentions}

Please use this thread to share your salary.`,
});
  return thread;
}