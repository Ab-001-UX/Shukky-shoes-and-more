export default async function handler(req, res) {
  try {
    // Prioritize BACKEND_URL over VITE_API_BASE_URL (BACKEND_URL should be the absolute backend URL)
    let backendUrl = process.env.BACKEND_URL || process.env.VITE_API_BASE_URL;
    if (!backendUrl) {
      console.error('[Cron Error] Neither BACKEND_URL nor VITE_API_BASE_URL is configured.');
      return res.status(500).json({ error: 'BACKEND_URL or VITE_API_BASE_URL is not configured' });
    }

    // Standardize URL: if it is "/api" or a relative path, resolve it to the current host
    const host = req.headers.host || 'localhost';
    if (backendUrl === '/api' || backendUrl.startsWith('/')) {
      const protocol = host.includes('localhost') ? 'http' : 'https';
      backendUrl = `${protocol}://${host}${backendUrl === '/api' ? '/api' : backendUrl}`;
    }

    // Check if the resolved backend URL points back to this Vercel deployment (preventing infinite recursion)
    if (backendUrl.includes(host) && !host.includes('localhost')) {
      console.error(`[Cron Error] Infinite loop blocked. Resolved backend URL (${backendUrl}) points back to the current host (${host}).`);
      return res.status(400).json({
        status: 'error',
        message: 'Infinite loop blocked: The resolved backend URL points to the Vercel deployment itself instead of the external Express backend. Please set the BACKEND_URL environment variable to your Express server absolute URL in the Vercel dashboard.'
      });
    }

    // Standardize the endpoint path format
    let cronUrl = '';
    if (backendUrl.endsWith('/api')) {
      cronUrl = `${backendUrl}/cron/ping`;
    } else if (backendUrl.endsWith('/')) {
      cronUrl = `${backendUrl}api/cron/ping`;
    } else {
      cronUrl = `${backendUrl}/api/cron/ping`;
    }

    console.log(`[Cron Info] Forwarding database keep-alive ping to: ${cronUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(cronUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Vercel-Cron-Forwarder'
      }
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`[Cron Success] Backend responded with status ${response.status}:`, data);
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      console.warn(`[Cron Warning] Backend responded with status ${response.status} (Non-JSON):`, text.substring(0, 200));
      return res.status(response.status).json({
        status: response.statusText,
        message: 'Non-JSON response received from backend',
        body: text.substring(0, 500)
      });
    }
  } catch (error) {
    console.error('[Cron Error] Failed to forward ping:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to forward cron ping to backend',
      error: error.message
    });
  }
}

