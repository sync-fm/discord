import {
  Client,
  GatewayIntentBits,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { PostHog } from 'posthog-node';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
type DiscordEmojiConfig = {
  id: string;
  name: string;
  animated?: boolean;
};

const DISCORD_EMOJIS: Record<'error' | 'loading' | 'spotify' | 'applemusic' | 'ytmusic' | 'syncfm', DiscordEmojiConfig> = {
  error: { id: '1435863794168631317', name: 'error' },
  loading: { id: '1435863403024351282', name: 'loading', animated: true },
  spotify: { id: '1435862833693986906', name: 'spotify' },
  applemusic: { id: '1435861927665467412', name: 'applemusic' },
  ytmusic: { id: '1435868161756106873', name: 'ytmusic' },
  syncfm: { id: '1435861570835189791', name: 'syncfm' },
};

const formatEmoji = ({ id, name, animated }: DiscordEmojiConfig): string =>
  `<${animated ? 'a' : ''}:${name}:${id}>`;

const toComponentEmoji = ({ id, name, animated }: DiscordEmojiConfig) => ({ id, name, animated });

const applyButtonEmoji = (button: ButtonBuilder, emoji?: DiscordEmojiConfig, fallback?: string): ButtonBuilder => {
  if (emoji) {
    button.setEmoji(toComponentEmoji(emoji));
  } else if (fallback) {
    button.setEmoji(fallback);
  }
  return button;
};

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com';
const POSTHOG_DISABLED = (process.env.POSTHOG_DISABLED ?? '').toLowerCase() === 'true';
const POSTHOG_FLUSH_AT = Number(process.env.POSTHOG_FLUSH_AT ?? '') || 1;
const POSTHOG_FLUSH_INTERVAL_MS = Number(process.env.POSTHOG_FLUSH_INTERVAL_MS ?? '') || 1000;

const posthogClient = POSTHOG_API_KEY && !POSTHOG_DISABLED
  ? new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: POSTHOG_FLUSH_AT,
    flushInterval: POSTHOG_FLUSH_INTERVAL_MS,
  })
  : null;

const captureAnalyticsEvent = (eventName: string, distinctId: string, properties?: Record<string, unknown>) => {
  if (!posthogClient || !distinctId) {
    return;
  }

  posthogClient.capture({
    distinctId,
    event: eventName,
    properties,
  });
};

if (posthogClient) {
  const shutdownPosthog = () => {
    posthogClient.shutdown();
  };

  process.on('beforeExit', shutdownPosthog);
  process.on('exit', shutdownPosthog);
  process.on('SIGINT', () => {
    shutdownPosthog();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    shutdownPosthog();
    process.exit(0);
  });
}

type MusicEntityType = 'song' | 'album' | 'artist';

type SyncFMExternalIdKey = 'Spotify' | 'AppleMusic' | 'YouTube';

type SyncFMEntity = {
  syncId: string;
  shortcode?: string;
  title?: string;
  name?: string;
  artists?: string[];
  album?: string;
  imageUrl?: string;
  externalIds?: Partial<Record<SyncFMExternalIdKey, string>>;
  songs?: Array<{ title: string }>;
};

interface SyncFMConversionResult {
  link: string;
  entity: SyncFMEntity;
  type: MusicEntityType;
}

type SupportedMusicService = 'spotify' | 'applemusic' | 'ytmusic';

const SERVICE_LABELS: Record<SupportedMusicService, { label: string; emoji?: DiscordEmojiConfig; fallback?: string; externalKey: SyncFMExternalIdKey }> = {
  spotify: { label: 'Open in Spotify', emoji: DISCORD_EMOJIS.spotify, externalKey: 'Spotify' },
  applemusic: { label: 'Open in Apple Music', emoji: DISCORD_EMOJIS.applemusic, externalKey: 'AppleMusic' },
  ytmusic: { label: 'Open in YouTube Music', emoji: DISCORD_EMOJIS.ytmusic, externalKey: 'YouTube' },
};

const getSupportedServiceHosts = (): Record<SupportedMusicService, string[]> => {
  const enableStandardYoutube = (process.env.DISCORD_ENABLE_YOUTUBE ?? '').toLowerCase() === 'true';

  return {
    spotify: ['spotify.com'],
    applemusic: ['music.apple.com'],
    ytmusic: enableStandardYoutube
      ? ['music.youtube.com', 'youtube.com', 'youtu.be']
      : ['music.youtube.com'],
  };
};

const LEADING_PUNCTUATION = /^[<({\['"]+/;
const TRAILING_PUNCTUATION = /[>)}\]'".,!?;:]+$/;

const ensureHttpScheme = (input: string): string =>
  /^https?:\/\//i.test(input) ? input : `https://${input}`;

const sanitizePotentialUrl = (candidate: string): string =>
  candidate.replace(LEADING_PUNCTUATION, '').replace(TRAILING_PUNCTUATION, '');

export const detectMusicServiceFromUrl = (url: string): SupportedMusicService | null => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    const hostsMap = getSupportedServiceHosts();

    for (const [service, hosts] of Object.entries(hostsMap) as [SupportedMusicService, string[]][]) {
      if (hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
        return service;
      }
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Extract music URLs from message content
 */
export function extractMusicUrl(content: string): string | null {
  if (!content) {
    return null;
  }

  const tokens = content.split(/\s+/);

  for (const token of tokens) {
    const candidate = sanitizePotentialUrl(token);
    if (!candidate) {
      continue;
    }

    const normalized = ensureHttpScheme(candidate);
    const service = detectMusicServiceFromUrl(normalized);
    if (service) {
      return normalized;
    }
  }
  return null;
}

/**
 * Convert a music URL to a SyncFM link
 */
const inferEntityType = (entity: SyncFMEntity): MusicEntityType => {
  if (entity.songs && entity.songs.length > 0) {
    return 'album';
  }
  if (entity.name && !entity.title) {
    return 'artist';
  }
  return 'song';
};

async function convertToSyncFM(url: string): Promise<SyncFMConversionResult | null> {
  try {
    const apiUrl = `https://syncfm.dev/api/handle/syncfm?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`SyncFM API error: ${response.status} ${response.statusText}`);
      posthogClient?.captureException(new Error(`SyncFM API error: ${response.status} ${response.statusText}`));
      return null;
    }

    const entity = await response.json() as SyncFMEntity;

    if (!entity || typeof entity !== 'object' || !entity.syncId) {
      console.error('SyncFM response missing syncId');
      posthogClient?.captureException(new Error('SyncFM response missing syncId'));
      return null;
    }

    const shortcode = entity.shortcode ?? null;
    const link = shortcode
      ? `https://syncfm.dev/s/${shortcode}`
      : `https://syncfm.dev/api/handle/syncfm?syncId=${encodeURIComponent(entity.syncId)}&service=syncfm`;

    return {
      link,
      entity,
      type: inferEntityType(entity),
    };
  } catch (error) {
    console.error('Error calling SyncFM API:', error);
    posthogClient?.captureException(error instanceof Error ? error : new Error('Unknown error in convertToSyncFM'));
    return null;
  }
}

async function createServiceUrl(
  service: SupportedMusicService,
  entity: SyncFMEntity,
  type: MusicEntityType,
): Promise<string | null> {
  try {
    const response = await fetch('https://syncfm.dev/api/createUrl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service,
        input: entity,
        type,
      }),
    });

    if (!response.ok) {
      console.error(`createUrl API error for ${service}: ${response.status} ${response.statusText}`);
      posthogClient?.captureException(new Error(`createUrl API error for ${service}: ${response.status} ${response.statusText}`));
      return null;
    }

    const data = await response.json() as { url?: string };
    return data.url ?? null;
  } catch (error) {
    console.error(`Failed to call createUrl for ${service}:`, error);
    posthogClient?.captureException(error instanceof Error ? error : new Error(`Unknown error in createServiceUrl for ${service}`));
    return null;
  }
}

const buildServiceButtons = async (
  conversion: SyncFMConversionResult,
): Promise<ActionRowBuilder<ButtonBuilder> | null> => {
  const buttons: ButtonBuilder[] = [];

  const syncfmButton = applyButtonEmoji(
    new ButtonBuilder()
      .setLabel('Open in SyncFM')
      .setStyle(ButtonStyle.Link)
      .setURL(conversion.link),
    DISCORD_EMOJIS.syncfm,
  );
  buttons.push(syncfmButton);

  const entries = Object.entries(SERVICE_LABELS) as [SupportedMusicService, { label: string; emoji?: DiscordEmojiConfig; fallback?: string; externalKey: SyncFMExternalIdKey }][];
  const serviceButtons = await Promise.all(entries.map(async ([service, meta]) => {
    const hasId = conversion.entity.externalIds?.[meta.externalKey];
    if (!hasId) {
      return null;
    }
    const url = await createServiceUrl(service, conversion.entity, conversion.type);
    if (!url) {
      return null;
    }

    return applyButtonEmoji(
      new ButtonBuilder()
        .setLabel(meta.label)
        .setStyle(ButtonStyle.Link)
        .setURL(url),
      meta.emoji,
      meta.fallback,
    );
  }));

  serviceButtons
    .filter((button): button is ButtonBuilder => Boolean(button))
    .forEach((button) => buttons.push(button));

  if (buttons.length === 0) {
    return null;
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
};

// Create Discord client with necessary intents
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Ready event
client.once('clientReady', () => {
  captureAnalyticsEvent('discord-bot-started', 'system', {
    timestamp: new Date().toISOString(),
  });
});

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  // Handle message context menu commands
  if (interaction.isMessageContextMenuCommand()) {
    if (interaction.commandName === 'Convert to SyncFM') {
      const messageContent = interaction.targetMessage.content;
      const distinctId = interaction.user?.id ?? 'anonymous';
      const analyticsBase = {
        guildId: interaction.guildId ?? 'dm',
        channelId: interaction.channelId,
        userId: interaction.user.id,
        targetMessageId: interaction.targetId,
      };

      captureAnalyticsEvent('discord-syncfm-command-invoked', distinctId, analyticsBase);

      // Defer reply since API call might take time
      await interaction.deferReply();
      await interaction.editReply({
        content: `${formatEmoji(DISCORD_EMOJIS.loading)} Converting your link...`,
        components: [],
        embeds: [],
      });

      if (!messageContent) {
        captureAnalyticsEvent('discord-syncfm-error-no-message-content', distinctId, analyticsBase);
        await interaction.editReply({
          content: `${formatEmoji(DISCORD_EMOJIS.error)} Could not retrieve message content.`,
          embeds: [],
          components: [],
        });
        return;
      }

      const musicUrl = extractMusicUrl(messageContent);

      if (!musicUrl) {
        captureAnalyticsEvent('discord-syncfm-no-supported-link', distinctId, analyticsBase);
        await interaction.editReply({
          content: `${formatEmoji(DISCORD_EMOJIS.error)} No supported music link found in this message.\n\nSupported platforms: Spotify, Apple Music, YouTube Music`,
          embeds: [],
          components: [],
        });
        return;
      }

      const sourceService = detectMusicServiceFromUrl(musicUrl) ?? 'unknown';

      captureAnalyticsEvent('discord-syncfm-conversion-start', distinctId, {
        ...analyticsBase,
        sourceService,
        sourceUrl: musicUrl,
        timestamp: Date.now(),
      });

      const conversionStart = performance.now();
      const conversion = await convertToSyncFM(musicUrl);
      const conversionEnd = performance.now();
      const durationMs = Math.max(0, conversionEnd - conversionStart);

      if (conversion) {
        const displayTitle = conversion.type === 'artist'
          ? conversion.entity.name ?? 'Unknown Artist'
          : conversion.entity.title ?? 'Unknown Title';

        const embed = new EmbedBuilder()
          .setColor(0xf67c04)
          .setTitle(displayTitle)
          .setURL(conversion.link)
          .setFooter({ text: 'Powered by SyncFM • Requested by ' + interaction.user.tag })
          .setTimestamp(new Date());

        if (conversion.type !== 'artist') {
          const artists = conversion.entity.artists ?? [];
          if (artists.length > 0) {
            embed.addFields({
              name: 'Artists',
              value: artists.join(', ').slice(0, 1024) || 'Unknown Artist',
              inline: false,
            });
          }
        }

        if (conversion.entity.album) {
          embed.addFields({ name: 'Album', value: conversion.entity.album, inline: false });
        }

        embed.addFields({ name: 'Type', value: conversion.type.toUpperCase(), inline: true });
        embed.addFields({ name: 'SyncFM Link', value: `[Open in SyncFM](${conversion.link})`, inline: true });

        if (conversion.entity.imageUrl) {
          embed.setThumbnail(conversion.entity.imageUrl);
        }

        const serviceButtons = await buildServiceButtons(conversion);

        captureAnalyticsEvent('discord-syncfm-conversion-success', distinctId, {
          ...analyticsBase,
          sourceService,
          syncId: conversion.entity.syncId,
          entityType: conversion.type,
          hasShortcode: Boolean(conversion.entity.shortcode),
          availableServices: Object.keys(conversion.entity.externalIds ?? {}),
          syncfmLink: conversion.link,
          durationMs,
        });

        await interaction.editReply({
          content: '',
          embeds: [embed],
          components: serviceButtons ? [serviceButtons] : [],
        });
      } else {
        captureAnalyticsEvent('discord-syncfm-conversion-failed', distinctId, {
          ...analyticsBase,
          sourceService,
          sourceUrl: musicUrl,
          durationMs,
        });
        await interaction.editReply({
          content: `${formatEmoji(DISCORD_EMOJIS.error)} Failed to convert link. The URL might not be supported or the service is unavailable.`,
          embeds: [],
          components: [],
        });
      }
    }
  }
});

// Error handling
client.on('error', (error) => {
  posthogClient?.captureException(error);
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  posthogClient?.captureException(error);
  console.error('Unhandled promise rejection:', error);
});

// Only start bot if this file is run directly
if (import.meta.main) {
  if (!DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN environment variable is required');
    process.exit(1);
  }

  client.login(DISCORD_BOT_TOKEN).catch((error) => {
    console.error('Failed to login:', error);
    posthogClient?.captureException(error);
    process.exit(1);
  });
}

export { client };
