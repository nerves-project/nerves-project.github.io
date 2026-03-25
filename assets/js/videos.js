export default {
  init () {
    document.addEventListener('DOMContentLoaded', () => {
      const $tabs = Array.prototype.slice.call(document.querySelectorAll('#video-container .video-tab'), 0);
      const $contents = Array.prototype.slice.call(document.querySelectorAll('#video-container div[id$="-content"]'));

      $tabs.forEach( el => {
        el.addEventListener('click', () => {

          $tabs.forEach( tab => {
            tab.classList.remove('is-active');
          });
          $contents.forEach( content => {
            if (content.id === `${el.id}-content`) {
              content.style.display = 'block';
            } else {
              content.style.display = 'none';
            }
          });

          el.classList.add('is-active');

        });
      });

    });
  }
}
