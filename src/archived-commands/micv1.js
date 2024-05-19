import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';

import recorder from 'node-record-lpcm16';
import { PassThrough } from 'stream';

export default {
	data: new SlashCommandBuilder()
		.setName('mic')
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

				const passThrough = new PassThrough();
				const recording = recorder.record({
					sampleRate: 16000,
					audioType: 'wav',
				});

				recording.stream().pipe(passThrough);

				player.play(createAudioResource(passThrough, { inlineVolume: true }));

				player.on(AudioPlayerStatus.Idle, () => {
					recording.stop();
					connection.destroy();
				});
				if(connection.state.status== VoiceConnectionStatus.Ready) {
					connection.destroy();
				}
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
