import modal from './modal'
import Navbar from './navbar'
import videos from './videos'

Navbar.init()
modal.init()

if (window.location.href.indexOf("videos") != -1) {
  videos.init()
}
