[Cozy][cozy] Pronote
=======================================

What's Cozy?
------------

<div>
<img src="https://cdn.rawgit.com/cozy/cozy-guidelines/master/templates/cozy_logo_small.svg" height="48" />
<img src="https://github.com/user-attachments/assets/43f1633c-d9a2-4075-8a4c-9405e759ca6b" height="42" />
</div>

[Cozy] is a personal data platform that brings all your web services in the same private space. With it, your webapps and your devices can share data easily, providing you with a new experience. You can install Cozy on your own hardware where no one's tracking you.

What's implemented ?
--------------------
- **Login to Pronote**
  + [x] Basic (username / password / url) authentification
  + [ ] CAS/ENT authentification
  + [ ] QR-Code authentification
- **Main features**
  + [x] Fetching student data
  + [x] Fetching student timetable
  + [x] Fetching student homework
  + [x] Fetching student grades
  + [x] Fetching student attendance
- **Secondary features**
  + [x] Downloading files to Cozy Drive

Main doctypes
-------------

| Data  | Doctype                   | Commentaire                                                                                                                                  |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Student identity | `io.cozy.identities`        |                                                                                                                                              |
| Timetable     | `io.cozy.calendar.event`    |                                                                                                                                              |
| Lesson content   | `io.cozy.calendar.event`    | (inhérent à l’emploi du temps)                                                                                                               |
| Homework             | `io.cozy.calendar.todos`    |                                                                                                                                              |
| Grades               | `io.cozy.timeseries.grades` |                                                                                                                                              |
| Attendance        | `io.cozy.calendar.presence` | Tout événement (retard, absence) partage le même doctype                                                                                     |

What is this konnector about ?
------------------------------

This konnector retrieves your student data and files from Pronote using the [Pawnote](https://github.com/LiterateInk/Pawnote/) open-source library.

### Open a Pull-Request

If you want to work on this konnector and submit code modifications, feel free to open pull-requests!
</br>See :
* the [contributing guide][contribute] for more information about how to properly open pull-requests.
* the [konnectors development guide](https://docs.cozy.io/en/tutorials/konnector/)

### Run and test

Create a `konnector-dev-config.json` file at the root with your test credentials :

```javascript
{
  "COZY_URL": "http://cozy.tools:8080",
  "fields": {
    "login":"demonstration",
    "password":"pronotevs",
    "url":"https://demo.index-education.net/pronote/eleve.html"
  }
}
```
Then :

```sh
yarn
yarn standalone
```
For running the konnector connected to a Cozy server and more details see [konnectors tutorial](https://docs.cozy.io/en/tutorials/konnector/)

### Cozy-konnector-libs

This connector uses [cozy-konnector-libs](https://github.com/cozy/cozy-konnector-libs). It brings a bunch of helpers to interact with the Cozy server and to fetch data from an online service.

### Maintainer

The lead maintainer for this konnector is [@ecnivtwelve](https://github.com/ecnivtwelve/)


### Get in touch

You can reach the Cozy Community by:

- [Konnectors tutorial](https://docs.cozy.io/en/tutorials/konnector/)
- Chatting with us on IRC [#cozycloud on Libera.Chat][libera]
- Posting on our [Forum]
- Posting issues on the [Github repos][github]
- Say Hi! on [Twitter] or [Mastodon]


License
-------

[konnectors/pronote](https://github.com/konnectors/pronote) is developed by Vince Linise and distributed under the [AGPL v3 license][agpl-3.0].

[cozy]: https://cozy.io "Cozy Cloud"
[agpl-3.0]: https://www.gnu.org/licenses/agpl-3.0.html
[libera]: https://web.libera.chat/#cozycloud
[forum]: https://forum.cozy.io/
[github]: https://github.com/cozy/
[nodejs]: https://nodejs.org/
[standard]: https://standardjs.com
[twitter]: https://twitter.com/cozycloud
[mastodon]: https://framapiaf.org/@CozyCloud
[webpack]: https://webpack.js.org
[yarn]: https://yarnpkg.com
[travis]: https://travis-ci.org
[contribute]: CONTRIBUTING.md
