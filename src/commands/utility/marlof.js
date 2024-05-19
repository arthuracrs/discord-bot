import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } from '@discordjs/voice';
import { createReadStream } from 'node:fs'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
	data: new SlashCommandBuilder()
		.setName('marlof')
		.setDescription('Plays an audio file in your current voice channel.'),
	async execute(interaction) {
		try {
			if (interaction.member.voice.channel) {
				const connection = joinVoiceChannel({
					channelId: interaction.member.voice.channel.id,
					guildId: interaction.guild.id,
					adapterCreator: interaction.guild.voiceAdapterCreator,
				});

				const player = createAudioPlayer();

				const resource = createAudioResource(createReadStream(join(__dirname, 'marlof.mp3'), {
					inputType: StreamType.OggOpus,
				}));

				player.play(resource);

				player.on(AudioPlayerStatus.Idle, () => {
					connection.destroy();
				});

				connection.subscribe(player);

				await interaction.reply('Playing audio...');
			} else {
				await interaction.reply('You need to join a voice channel first!');
			}
		} catch (error) {
			console.log(error)
		}
	},
};
