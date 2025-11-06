/**
 * Verification script to check Discord app setup
 * Run with: bun src/verify-setup.ts
 */

const REQUIRED_ENV_VARS = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
];

function checkEnvironmentVariables(): boolean {
  console.log('Checking environment variables...\n');

  let allPresent = true;

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];

    if (!value || value === '' || value.includes('your_') || value.includes('_here')) {
      console.log(`ERROR ${varName}: NOT SET or using placeholder value`);
      allPresent = false;
    } else {
      // Show first few characters for verification
      const preview = value.substring(0, 8) + '...';
      console.log(`MEOW ${varName}: ${preview}`);
    }
  }

  return allPresent;
}

async function verifyDiscordAPIAccess(): Promise<boolean> {
  console.log('\nVerifying Discord API access...\n');

  const botToken = process.env.DISCORD_BOT_TOKEN || '';
  const clientId = process.env.DISCORD_CLIENT_ID || '';

  if (!botToken || !clientId) {
    console.log('ERROR Cannot verify - missing credentials');
    return false;
  }

  try {
    const url = `https://discord.com/api/v10/applications/${clientId}/commands`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (response.ok) {
      const commands = await response.json() as any[];
      console.log(`MEOW Discord API access: OK`);
      console.log(`Registered commands: ${commands.length}`);

      if (commands.length > 0) {
        console.log('   Commands:');
        commands.forEach((cmd: any) => {
          console.log(`- ${cmd.name} (Type: ${cmd.type})`);
        });
      } else {
        console.log('WARN: No commands registered yet. Run: bun run register');
      }
      return true;
    } else {
      const errorText = await response.text();
      console.log(`ERROR Discord API access: FAILED (${response.status})`);
      console.log(`Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`ERROR Discord API access: ERROR`);
    console.log(`${error}`);
    return false;
  }
}

async function verifySyncFMAPI(): Promise<boolean> {
  console.log('\nVerifying SyncFM API access...\n');

  try {
    // Test with a sample Spotify URL
    const testUrl = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp';
    const apiUrl = `https://syncfm.dev/api/handle/syncfm?url=${encodeURIComponent(testUrl)}`;

    const response = await fetch(apiUrl);

    if (response.ok) {
      const data = await response.json() as any;
      if (data.shortcode) {
        console.log(`MEOW SyncFM API access: OK`);
        console.log(`Sample shortcode: ${data.shortcode}`);
        console.log(`Sample link: https://syncfm.dev/s/${data.shortcode}`);
        return true;
      } else {
        console.log(`WARN: SyncFM API responded but no shortcode in response`);
        return false;
      }
    } else {
      console.log(`ERROR SyncFM API access: FAILED (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`ERROR SyncFM API access: ERROR`);
    console.log(`${error}`);
    return false;
  }
}

function printNextSteps(envOk: boolean, discordOk: boolean, syncfmOk: boolean) {
  console.log('\n' + '='.repeat(60));
  console.log('SETUP STATUS');
  console.log('='.repeat(60));

  if (!envOk) {
    console.log('\nERROR Environment variables are not properly configured');
    console.log("bawling")
    return;
  }

  if (!discordOk) {
    console.log('\nERROR Discord API access failed');
    console.log('bawling')
    return;
  }

  if (!syncfmOk) {
    console.log('\nWARN: SyncFM API access failed (may be a network issue)');
    console.log('pawsibly ballin, but maybe bawling');
  }

  console.log('\nMEOW Setup verification complete!');
  console.log('we should be ballin')
}

async function main() {
  console.log('@syncfm/discord sanity check');
  console.log('='.repeat(60) + '\n');

  const envOk = checkEnvironmentVariables();
  let discordOk = false;
  let syncfmOk = false;

  if (envOk) {
    discordOk = await verifyDiscordAPIAccess();
    syncfmOk = await verifySyncFMAPI();
  }

  printNextSteps(envOk, discordOk, syncfmOk);
}

main();
