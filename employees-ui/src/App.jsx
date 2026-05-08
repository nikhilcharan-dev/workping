import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper'
import AppRouter from './routes/router'
import '@/assets/scss/app.scss'
const App = () => {
  return (
    <AppProvidersWrapper>
      {/* remove appproviderwrapper */}
      <AppRouter />
    </AppProvidersWrapper>
  )
}
export default App
