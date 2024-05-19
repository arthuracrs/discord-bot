import { SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('eoq')
		.setDescription('solado!'),
	async execute(interaction) {
		await interaction.reply('Fon!');
	},
};