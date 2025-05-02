import './App.css'
import '../bootstrap.css'
import Home from './components/home/Home'
import About from './components/about/About'
import Custom_navbar1 from './components/custom_navbar/Custom_navbar1';

function App() {

  return (
    <div>
      <Custom_navbar1 />
      <Home />
      <About />
    </div>
  )
}

export default App
