import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { join } from "path";
import { formatCurrency, dbClient } from "../utils";

export default {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send money to someone')
        .setDMPermission(false)
        .addUserOption((o) => o
            .setName('user')
            .setDescription('The user to send money to')
            .setRequired(true)
        )
        .addIntegerOption((o) => o
            .setName('amount')
            .setDescription('The amount to send')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1000000)
        ),
    run: async (i: CommandInteraction) => {
        if (!i.inGuild()) return (i as CommandInteraction).editReply('You must be in a guild to use this command')
        const user = i.options.getUser('user', true)
        if (user.id === i.user.id || user.bot) return i.editReply('You cannot send money to yourself or bots')
        const amount = i.options.getInteger('amount', true)
        if (amount <= 0) return i.editReply('You cannot send 0 or negative money')
        const img = await dbClient.sendMoneyFromTo(i.user.id, user.id, amount, i.guildId).then(() => 'success').catch(() => 'fail')
        const image = join(process.cwd(), 'assets', `payment_${img}.gif`)
        i.editReply({
            content: `You${img === 'fail' ? " didn't " : " "}sent ${await formatCurrency(amount, i.guildId)} to ${user.username}`,
            files: [image]
        })
    }
}