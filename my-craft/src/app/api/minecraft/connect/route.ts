import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port } = body;

    if (!host || !port) {
      return NextResponse.json(
        { error: 'Missing required fields: host, port' },
        { status: 400 }
      );
    }

    // Test connection to Minecraft server
    const net = await import('net');

    return new Promise<NextResponse>((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(NextResponse.json(
          { error: 'Connection timeout', connected: false },
          { status: 408 }
        ));
      }, 5000);

      socket.connect(parseInt(port), host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(NextResponse.json({
          success: true,
          connected: true,
          host,
          port: parseInt(port),
          message: 'Successfully connected to Minecraft server'
        }));
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(NextResponse.json(
          {
            error: `Failed to connect to ${host}:${port} - ${error.message}`,
            connected: false
          },
          { status: 503 }
        ));
      });
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      { error: 'Failed to test connection', connected: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get('host');
  const port = searchParams.get('port');

  if (!host || !port) {
    return NextResponse.json(
      { error: 'Missing required parameters: host, port' },
      { status: 400 }
    );
  }

  try {
    // Get server info using minecraft-protocol
    const mc = await import('minecraft-protocol');

    return new Promise<NextResponse>((resolve) => {
      mc.ping({
        host: host,
        port: parseInt(port)
      }, (err, result) => {
        if (err) {
          resolve(NextResponse.json(
            {
              error: `Failed to ping server: ${err.message}`,
              connected: false
            },
            { status: 503 }
          ));
        } else {
          resolve(NextResponse.json({
            success: true,
            connected: true,
            serverInfo: {
              version: (result as any).version,
              description: (result as any).description,
              players: (result as any).players,
              host,
              port: parseInt(port)
            }
          }));
        }
      });
    });
  } catch (error) {
    console.error('Error getting server info:', error);
    return NextResponse.json(
      { error: 'Failed to get server info', connected: false },
      { status: 500 }
    );
  }
}