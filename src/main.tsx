import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import {Game} from './Game'

createRoot(document.getElementById('root')!).render(<Game/>)
