;(function () {
  const LOCALHOST_URL = [
    'http://localhost:3000/@vite/client',
    'http://localhost:3000/src/main.js',
  ]
  const PROD_URL = ['https://twilight-fringe.vercel.app/main.js']

  function createScripts(arr) {
    return arr.map(function (url) {
      const s = document.createElement('script')
      s.src = url
      // Removed defer to match working script

      // Both dev and production scripts need to be modules
      s.type = 'module'

      // Add error and load event listeners for debugging
      s.addEventListener('load', function () {
        console.log(`✅ Script loaded successfully: ${url}`)
      })

      s.addEventListener('error', function (e) {
        console.error(`❌ Script failed to load: ${url}`, e)
      })

      return s
    })
  }

  function insertScript(scriptArr) {
    console.log(`📦 Attempting to insert ${scriptArr.length} scripts`)
    scriptArr.forEach(function (script, index) {
      console.log(`📌 Inserting script ${index + 1}: ${script.src}`)
      document.body.appendChild(script)
    })
  }

  const localhostScripts = createScripts(LOCALHOST_URL)
  const prodScripts = createScripts(PROD_URL)

  // Polyfill for process.env if it's missing in production
  if (typeof process === 'undefined') {
    window.process = {
      env: {
        NODE_ENV: 'production',
        DEV: false,
        PROD: true,
        // Add any other environment variables your code might need
      },
    }
    console.log('🔧 Added process.env polyfill for production')
  }

  let choosedScripts = null

  console.log('🔍 Checking for localhost development server...')

  // Alternative detection method: check if we're on localhost
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')

  if (isLocalhost) {
    console.log('🌐 Running on localhost, loading development scripts directly')
    choosedScripts = localhostScripts
    console.log('🚀 Loading development scripts')
    insertScript(choosedScripts)
  } else {
    console.log('🌐 Running in production, loading production scripts')
    choosedScripts = prodScripts
    insertScript(choosedScripts)
  }
})()
