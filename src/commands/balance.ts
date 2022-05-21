import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { formatCurrency, dbClient } from "../utils";

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance')
        .setDMPermission(false),
    run: async (i: CommandInteraction) => {
        if (!i.inGuild()) return (i as CommandInteraction).editReply('You must be in a guild to use this command')
        const acc = await dbClient.getAccount(i.user.id, i.guildId)
        i.editReply(`Your balance is ${await formatCurrency(acc.balance, i.guildId)}`)
    }
}