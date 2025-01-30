import modal from './modal'
import Navbar from './navbar'
import videos from './videos'
import hardware from './hardware'

Navbar.init()
modal.init()

if (window.location.href.indexOf("videos") != -1) {
  videos.init()
}
if (window.location.href.indexOf("hardware") != -1) {
  hardware.init()
}
