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

    const diagnostics = {
      host,
      port: parseInt(port),
      tests: [],
      summary: ''
    };

    // Test 1: Basic TCP connection
    try {
      const net = await import('net');
      const tcpResult = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 5000);

        socket.connect(parseInt(port), host, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        });

        socket.on('error', () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(false);
        });
      });

      (diagnostics.tests as any[]).push({
        name: 'TCP Connection',
        status: tcpResult ? 'pass' : 'fail',
        message: tcpResult ? 'Port is reachable' : 'Cannot connect to port'
      });
    } catch (error) {
      (diagnostics.tests as any[]).push({
        name: 'TCP Connection',
        status: 'error',
        message: 'TCP test failed: ' + (error as Error).message
      });
    }

    // Test 2: Minecraft protocol ping
    try {
      const mc = await import('minecraft-protocol');
      const pingResult = await new Promise((resolve) => {
        mc.ping({
          host: host,
          port: parseInt(port)
        }, (err, result) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, result });
          }
        });
      });

      if ((pingResult as any).success) {
        (diagnostics.tests as any[]).push({
          name: 'Minecraft Protocol',
          status: 'pass',
          message: 'Server responds to Minecraft protocol',
          details: (pingResult as any).result
        });
      } else {
        (diagnostics.tests as any[]).push({
          name: 'Minecraft Protocol',
          status: 'fail',
          message: 'Server ping failed: ' + (pingResult as any).error
        });
      }
    } catch (error) {
      (diagnostics.tests as any[]).push({
        name: 'Minecraft Protocol',
        status: 'error',
        message: 'Protocol test failed: ' + (error as Error).message
      });
    }

    // Test 3: Version compatibility
    const version = '1.21.1';
    (diagnostics.tests as any[]).push({
      name: 'Version Check',
      status: 'info',
      message: `Bot will attempt to connect with version ${version}`
    });

    // Generate summary
    const passCount = (diagnostics.tests as any[]).filter(t => t.status === 'pass').length;
    const failCount = (diagnostics.tests as any[]).filter(t => t.status === 'fail').length;

    if (failCount === 0) {
      diagnostics.summary = 'All tests passed! Server should be connectable.';
    } else if (passCount === 0) {
      diagnostics.summary = 'All tests failed. Check if server is running and accessible.';
    } else {
      diagnostics.summary = 'Mixed results. Check failed tests for issues.';
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('Error running diagnostics:', error);
    return NextResponse.json(
      { error: 'Failed to run diagnostics: ' + (error as Error).message },
      { status: 500 }
    );
  }
}