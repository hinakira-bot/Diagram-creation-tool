import { useState } from 'react'
import ZukaiMaker from './ZukaiMaker'
import PasswordGate, { isAuthenticated } from './PasswordGate'

function App() {
  const [authed, setAuthed] = useState(isAuthenticated())

  if (!authed) {
    return <PasswordGate onAuthenticated={() => setAuthed(true)} />
  }

  return <ZukaiMaker />
}

export default App
