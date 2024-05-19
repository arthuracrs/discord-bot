import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { PassThrough } from 'stream';
import { spawn } from 'child_process';

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

				const soxChildProcess = spawn('sox', [
					'--encoding', 'signed-integer',
					'--channels', '1',
					'-t',
					'coreaudio',
					'CASTER Stream Mix 1',
					'--type',
					'wav',
					'-'
				], {})
				soxChildProcess.on('close', code => {
					if (code === 0) return
					soxChildProcess.stdout.emit('error', `${this.cmd} has exited with error code ${code}.`
					)
				})
				soxChildProcess.stdout.pipe(passThrough);

				player.play(createAudioResource(passThrough, { inlineVolume: true }));

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
