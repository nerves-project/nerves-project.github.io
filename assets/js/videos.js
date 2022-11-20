export default {
  init () {
    document.addEventListener('DOMContentLoaded', () => {
      // Get all "dropdown" elements
      const $tabs = Array.prototype.slice.call(document.querySelectorAll('#video-container div.tabs li'), 0);
      const $contents = Array.prototype.slice.call(document.querySelectorAll('#video-container div[id*="-content"]'))
    
      // Add a click event on each of them
      $tabs.forEach( el => {
        el.addEventListener('click', () => {
    
          $tabs.forEach( tab => {
            tab.classList.remove('is-active');
          });
          $contents.forEach( content => {
            if (content.id === `${el.children[0].id}-content`) {
              content.style.display = 'flex';
            } else {
              content.style.display = 'none';
            }
          });
    
          el.classList.toggle('is-active');
          
        });
      });
    
    });
  }
}
