import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } from '@discordjs/voice';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';

export default {
    data: new SlashCommandBuilder()
        .setName('stream')
        .setDescription('Plays an audio file in your current voice channel.'),
    async execute(interaction) {
        try {
            if (interaction.member.voice.channel) {
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                const ffmpeg = spawn('ffmpeg', [
                    '-i', 'rtmp://192.168.1.7/live/fon',
                    '-ar', '48000',
                    '-ac', '2',
                    '-codec:a', 'libopus', // Use libopus codec for Opus audio
                    '-f', 'ogg',            // Force output format to Ogg
                    'pipe:1'                // Pipe output to stdout
                ]);

                const passThrough = new PassThrough();
                ffmpeg.stdout.pipe(passThrough);

                const resource = createAudioResource(passThrough, {
                    inputType: StreamType.Opus
                });

                const player = createAudioPlayer();

                connection.subscribe(player);
                
                player.play(resource);

                await interaction.reply('Playing audio...');
            } else {
                await interaction.reply('You need to join a voice channel first!');
            }
        } catch (error) {
            console.log(error)
        }
    },
};
