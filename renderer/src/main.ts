import { createApp, watch } from 'vue'
import App from './web/App.vue'
import * as I18n from './web/i18n'
import * as Data from './assets/data'
import { initConfig, AppConfig } from './web/Config'
import { Host } from './web/background/IPC'
import { perfMark, perfTimeAsync } from './web/woke/shared/perf'
import { captureRendererErrors, captureVueError } from './web/woke/app/report'
import { checkLiveDataNow, rescheduleLiveDataChecks, startLiveDataChecks, useDownloadedData } from './web/woke/app/live-data'
import { useLeagues } from './web/background/Leagues'

// woke: the first-run setup window loads this page with #setup. It needs no
// item data, so it opens quicker.
const isSetupWindow = window.location.hash === '#setup'

;(async function () {
  // woke: settings may have to save while loading (see initConfig), which needs
  // the connection first.
  await perfTimeAsync('Startup: connect to app', Host.init())
  await perfTimeAsync('Startup: load settings', initConfig())
  // woke: these two don't depend on each other, so load them side by side.
  const [i18nPlugin] = await Promise.all([
    perfTimeAsync('Startup: load translations', I18n.init(AppConfig().language)),
    isSetupWindow ? Promise.resolve() : perfTimeAsync('Startup: load item + stat data', Data.init(AppConfig().language))
  ])
  captureRendererErrors()
  if (!isSetupWindow) {
    await useDownloadedData(AppConfig().language)
    startLiveDataChecks(() => AppConfig().language, () => useLeagues().startedAt.value)
    watch(() => useLeagues().startedAt.value, () => { rescheduleLiveDataChecks() })
  }

  watch(() => AppConfig().language, async () => {
    if (!isSetupWindow) {
      await Data.loadForLang(AppConfig().language)
      await useDownloadedData(AppConfig().language)
      checkLiveDataNow()
    }
    await I18n.loadLang(AppConfig().language)
  })

  const app = createApp(App)
  app.config.errorHandler = captureVueError
  app.use(i18nPlugin).mount('#app')
  perfMark('App mounted')
})()
