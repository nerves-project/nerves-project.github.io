import axios from "./axios";

export default {
  init() {
    function create_card(container, hexPackage, is_official) {
      var div = document.createElement("div");
        div.setAttribute("class", "column is-half");

        var extra = document.createElement("div");
        extra.setAttribute("class", "columns is-multiline");

        if ('extra' in hexPackage.meta) {
          hexPackage.meta.extra.entries().forEach(([key, value]) => {
            entry = document.createElement("div");
            entry.setAttribute("class", "box px-1 py-1 mx-1 my-1");
            entry.innerHTML = `<strong>${key}:</strong> ${val}`
            extra.appendChild(entry);
          });
        }

        var name = hexPackage.name
        var title = hexPackage.meta.description.replace("Nerves System -", "");
        var notes = ""
        if (hexPackage.meta.extra && hexPackage.meta.extra.notes) {
          notes = hexPackage.meta.extra.notes
        }

        var owners = ""
        if (is_official) {
          owners = `<span class="icon-text">
              <span class="icon" title="Officially supported by Nerves">
                <img src="/img/icon.png" alt="">
              </span>
              <span> official</span>
              </span>
            `
        }

        div.innerHTML = `
        <div class="card">
          <div class="card-content">

            <div class="media">
              <div class="media-left">
                <figure class="image is-128x128">
                  <img src="https://bulma.io/images/placeholders/128x128.png" alt="Placeholder image">
                </figure>
              </div>
              <div class="media-content">
                <p class="title is-4">${title}</p>
                <p class="subtitle is-6">
                  <a href="https://hex.pm/packages/${name}"><img src="https://img.shields.io/hexpm/v/${name}.svg?label=${name}" alt=""></a>
                  <a href=""><img src="https://img.shields.io/librariesio/release/hex/${name}" alt=""></a>
                </p>
                  ${owners}
                <p>${notes}</p>
              </div>
        
            </div>
            <div id="${name}-extra" class="content">
            </div>
        </div>
      </div>
      `;

      // this is hacky to put the extra stuff where I want it
      div.children[0].children[0].children[1].appendChild(extra);

      container.appendChild(div);
    }

    document.addEventListener("DOMContentLoaded", () => {
      var official_container = document.getElementById("official-hardware-items");
      var user_container = document.getElementById("user-hardware-items");

      axios.get("https://hex.pm/api/packages?search=depends%3Anerves_system_br&sort=downloads").then(function (response) {
        const grouped = {official: [], user: []}

        response.data.forEach((item) => {
          switch(item.name) {
            case "nerves_system_bbb":
            case "nerves_system_osd32mp1":
            case "nerves_system_rpi":
            case "nerves_system_rpi0":
            case "nerves_system_rpi2":
            case "nerves_system_rpi3":
            case "nerves_system_rpi3a":
            case "nerves_system_rpi4":
            case "nerves_system_vultr":
            case "nerves_system_x86_64":
            case "nerves_system_grisp2":
              grouped.official.push(item)
              break;
            default:
              grouped.user.push(item)
              break;
          }
        });

        grouped.official.forEach((hexPackage) => {
          create_card(official_container, hexPackage, true);
        })
        grouped.user.forEach((hexPackage) => {
          create_card(user_container, hexPackage, false);
        })
      })
    });
  },
};
