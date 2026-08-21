const { fromArrayBuffer } = require('geotiff');

// Apeldoorn, NL — small bounding box keeps the simulation fast.
// Format required by FastFlood: [min_longitude, max_latitude, max_longitude, min_latitude]
const BBOX = [5.9355, 52.2124, 5.9868, 52.1810];

exports.handler = async function (event) {
  const headers = {
    // Tighten this to your actual GitHub Pages origin once deployed,
    // e.g. 'https://k-van-roon.github.io'
    'Access-Control-Allow-Origin': 'https://k-van-roon.github.io',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const apiKey = process.env.FASTFLOOD_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'FASTFLOOD_API_KEY is not set in Netlify environment variables.' }),
      };
    }

    // 1. Run a fast forecast-driven simulation for Apeldoorn
    const runResponse = await fetch(
      'https://webapp-prod-fastflood.azurewebsites.net/v1/model/run-and-wait',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          autoforecast: {
            bbox: BBOX,
            date: 'latest',
            scenario: 'flashfloodfluvialflood',
            start_time: 0,
            end_time: 72,
            resolution: 'low', // keep it fast for an on-click demo
          },
        }),
      }
    );

    if (!runResponse.ok) {
      const text = await runResponse.text();
      throw new Error(`FastFlood API error (${runResponse.status}): ${text}`);
    }

    const runData = await runResponse.json();
    const depthFile = runData?.data?.files?.find((f) => f.name === 'whout.tif');

    if (!depthFile) {
      throw new Error('No depth raster (whout.tif) was returned by the model.');
    }

    // 2. Download the depth raster and read the pixel values
    const rasterResponse = await fetch(depthFile.href);
    const arrayBuffer = await rasterResponse.arrayBuffer();
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const depths = rasters[0];

    let maxDepth = 0;
    let wetCells = 0;
    let sum = 0;

    for (let i = 0; i < depths.length; i++) {
      const v = depths[i];
      if (v > 0 && v < 1000) {
        // filter out nodata values
        wetCells++;
        sum += v;
        if (v > maxDepth) maxDepth = v;
      }
    }

    const wetPercent = (wetCells / depths.length) * 100;
    const meanWetDepth = wetCells > 0 ? sum / wetCells : 0;

    // 3. Classify risk and write a plain-language blurb
    let risk;
    let blurb;

    if (maxDepth < 0.05) {
      risk = 'low';
      blurb =
        'Based on the latest rainfall forecast, no significant flooding is expected in Apeldoorn over the coming days. Simulated water depths stay below 5 cm across the modelled area.';
    } else if (maxDepth < 0.3) {
      risk = 'moderate';
      blurb = `The latest forecast run shows localized, shallow flooding is possible in parts of Apeldoorn — up to about ${maxDepth.toFixed(
        2
      )} m in the deepest simulated spots, affecting roughly ${wetPercent.toFixed(
        1
      )}% of the modelled area. Minor nuisance flooding on roads or low-lying ground is plausible.`;
    } else {
      risk = 'high';
      blurb = `The latest forecast run flags a meaningful flood risk for Apeldoorn — simulated depths reach up to ${maxDepth.toFixed(
        2
      )} m in places, covering around ${wetPercent.toFixed(
        1
      )}% of the modelled area. Conditions are worth monitoring closely.`;
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Apeldoorn, NL',
        risk,
        maxDepthM: Number(maxDepth.toFixed(3)),
        meanWetDepthM: Number(meanWetDepth.toFixed(3)),
        wetAreaPercent: Number(wetPercent.toFixed(1)),
        blurb,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
