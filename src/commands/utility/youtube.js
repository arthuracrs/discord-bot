import { SlashCommandBuilder } from '@discordjs/builders';
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import playdl from 'play-dl';

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

            const stream = await playdl.stream(url);

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });

            player.play(resource);

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
