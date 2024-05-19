import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } from '@discordjs/voice';
import { spawn } from 'child_process';

export default {
    data: new SlashCommandBuilder()
        .setName('streamkinda')
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

                const audioStream = ffmpeg.stdout;
                const resource = createAudioResource(audioStream, {
                    inputType: StreamType.OggOpus
                });

                // const resource = createAudioResource(join(__dirname, 'marlof.mp3'));
                const player = createAudioPlayer();

                player.play(resource);

                // player.on(AudioPlayerStatus.Idle, () => {
                //     connection.destroy();
                // });

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
