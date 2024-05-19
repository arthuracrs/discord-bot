import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { PassThrough } from 'stream';
import { spawn, spawnSync } from 'child_process';

export default {
	data: new SlashCommandBuilder()
		.setName('youtube')
		.setDescription("Play audio from a YouTube video in your voice channel.")
		.addStringOption(option =>
			option.setName('url')
				.setDescription('The YouTube URL of the audio to play')
				.setRequired(true)),
	async execute(interaction) {
		try {
			const url = interaction.options.getString('url');
			if (!url) {
				await interaction.reply('You need to provide a YouTube URL!');
				return;
			}

			if (!interaction.member.voice.channel) {
				await interaction.reply('You need to join a voice channel first!');
				return;
			}

			await interaction.deferReply(); 

			const connection = joinVoiceChannel({
				channelId: interaction.member.voice.channel.id,
				guildId: interaction.guild.id,
				adapterCreator: interaction.guild.voiceAdapterCreator,
			});

			const player = createAudioPlayer();

			const ytDlpProcess = spawnSync('yt-dlp', [
				'--extract-audio',
				'--audio-format', 'wav',
				'--audio-quality', '0',
				'--no-playlist',
				'--quiet',
				'--default-search', 'auto',
				'--get-url',
				url
			]);

			if (ytDlpProcess.error) {
				console.error('Error:', ytDlpProcess.error);
				await interaction.followUp('Invalid URL provided');
				return;
			}
			const audioUrl = ytDlpProcess.stdout.toString().trim();
			if (!audioUrl) {
				await interaction.followUp('Could not extract audio from the provided URL.');
				return;
			}

			const passThrough = new PassThrough();

			const ffmpegChildProcess = spawn('ffmpeg', [
				'-i', audioUrl,
				'-f', 'wav', '-ar', '48000', '-ac', '1', '-'
			], {});

			ffmpegChildProcess.stderr.on('data', (data) => {
				console.error(`FFmpeg stderr: ${data}`);
			});
			ffmpegChildProcess.on('exit', (code, signal) => {
				if (code !== 0) {
					console.error(`FFmpeg process exited with code ${code} and signal ${signal}`);
				}
			});
			ffmpegChildProcess.stdout.pipe(passThrough);

			player.play(createAudioResource(passThrough));

			connection.subscribe(player);

			await interaction.followUp('Playing audio...');
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp('An error occurred while trying to play the audio.');
			} else {
				await interaction.reply('An error occurred while trying to play the audio.');
			}
		}
	},
};
