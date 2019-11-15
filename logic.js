import { stops } from './stops.js'
const dev = false

const dev = false
let init = false

// related to live update
let isReloadPath = '//transit-display-api.mpierce.now.sh/api/reload'
let reloadCount = 0
let reloadTimeout = 3600

// init
window.onload = async () => {
  setInterval(timerEvents, 1000)
  // await getAndRenderPhoto()
}

const getReloadReload = async () => {
  const rawResponse = await fetch(isReloadPath)
  let reload = await rawResponse.text()
  let reloadParsed = JSON.parse(reload)
  if (reloadParsed.reload) {
    location.reload(true);
  }
}


const timerEvents = async () => {
  let now = new Date()
  // sets clock
  setDomClock(now)
  // get second so certain events fire
  let count = now.getSeconds()
  reloadCount++
  console.log(reloadCount)

  if (reloadCount === reloadTimeout) {
    await getReloadReload()
    reloadCount = 0
  }
  // if dev, just get once
  if (dev) {
    if (init) return
    await getRenderBartData(count)
    await getRenderMuniData(count)
    init = true
    return
  }

  if (
    !init ||
    count === 0 ||
    count === 15 ||
    count === 30 ||
    count === 45) {
    await getRenderBartData(count)
    await getRenderMuniData(count)
    init = true
  }
}

const getRenderBartData = async (count) => {
  console.log(`Fetching BART: ${count}`)
  $("#bart-loading").html("<div>Request</div>")

  const rawBartDataJson = async () => {
    if (dev) { return JSON.parse(window.bartData) }
    return await getBartData()
  }

  const parsedBartDataJson = parseBartData(await rawBartDataJson())
  // console.log('BART: ', parsedBartDataJson)
  renderBartDataDom(parsedBartDataJson)
  $("#bart-loading").html("")

}

const getRenderMuniData = async (count) => {
  console.log(`Fetching MUNI ${count}`)
  $("#muni-loading").html("<div>Request</div>")

  try {
    const rawDataString = async () => {
      if (dev) { return window.data }
      return await getStopDataNextbus()
    }

    const sortedByAgencyAndStopsObj = parseData(await rawDataString())
    // console.log('MUNI: ', sortedByAgencyAndStopsObj)

    renderDataToDom(sortedByAgencyAndStopsObj)
    $("#muni-loading").html("")
    $("#muni-error").html("")

  } catch (error) {
    console.error('error', error)
    $("#muni-error").html(error)

  }
}

// http://api.bart.gov/docs/overview/examples.aspx
const getBartData = async () => {
  const rawResponse = await fetch(`//api.bart.gov/api/etd.aspx?cmd=etd&orig=24th&key=MW9S-E7SL-26DU-VV8V&json=y`)
  return await rawResponse.json()
}

// assumes only one station, more than one would require refactor
const parseBartData = (rawBartDataJson) => {
  const preParse = rawBartDataJson.root.station[0].etd
  const station = {
    name: rawBartDataJson.root.station[0].name,
    platforms: {}
  }

  for (const line of preParse) {
    for (const estimate of line.estimate) {
      if (!station.platforms[estimate.platform] ||
        station.platforms[estimate.platform].length === 0) {
        station.platforms[estimate.platform] = []
      }

      var el = station.platforms[estimate.platform].filter(function (el) {
        return el.destination === line.destination;
      });

      if (!el.length) {
        station.platforms[estimate.platform].push({
          destination: [line.destination][0],
          estimate: line.estimate,
          sort: line.estimate[0].minutes,
          color: line.estimate[0].hexcolor,
          dir: line.estimate[0].direction
        })
      }

      station.platforms[estimate.platform].sort(function (a, b) {
        if (a.sort === "Leaving") {
          a.sort = "0"
        }
        if (b.sort === "Leaving") {
          b.sort = "0"
        }
        return Number(a.sort) - Number(b.sort);
      });
    }
  }

  return station
}

const renderBartDataDom = (parsedBartDataJson) => {
  const platforms = parsedBartDataJson.platforms

  let html =
    `
    <div class="agency-container df fdc">
      <li class="df fdr transport-type-container">
        <div class="m16">
        <img class="transport-type-icon" src="static/train.svg"/>
        <img class="transport-type-bart-logo" src="static/bart_logo.svg"/>
        </div>
      </li>
    <ul>
    <li class="stop">
      <h2 class="fwi">${parsedBartDataJson.name}</h2>
    </li>
  `

  for (const platform in platforms) {
    html += `<li class="bb platform df aic"><div class="df ph16" style="">Platform ${platform}</div></li>`

    for (const train of platforms[platform]) {
      html +=
        `<li class="bb df fdr aic">
          <div class="df fdr jcsb ph16 w100">
            <div class="df fdr">
              <div id='line-label' class="line-number line-number-label"
                style="background:${train.color}">
              </div>
              <div class="df fdc">
                <h2 class="fwb">${train.destination}</h2>
                <h3 class="fwi" id='dir'>${train.dir}</h3>
              </div>
            </div>
            <div class="df fdr">
        `

      for (const estimate of train.estimate) {
        html +=
          `
          <div class="arrival-time">
            <h1 class="arrival-time-text">${estimate.minutes}</h1>
          </div>`

      }
      html += `min</div></li>`

    }

  }

  $("#bart-data").html(html)

}


// also updates timer, and clock
const setDomClock = (now) => {
  // get time in correct format
  const getTime = () => {
    return now.toLocaleDateString([], {
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).slice(4, 9)
  }
  // update time in dom
  $("#time").text(getTime())
  // set bar width
  const width = now.getSeconds() * 100 / 60 + 1.66667
  $("#timer-progress").css('width', width + '%')
}

// make request to get data
const getStopDataNextbus = async () => {
  const rawResponse = await fetch('https://transit-display-api.mpierce.now.sh/api/muni')
  const jsonResponse = await rawResponse.json()
  return JSON.stringify(jsonResponse)
}


// parse a dreadful API response so I can use in DOM
const parseData = (rawDataString) => {
  // console.log('raw', JSON.parse(rawDataString))
  const dataObjectArr = JSON.parse(rawDataString)
  const sortedByAgencyAndStopsObj = {}

  for (let stopData of dataObjectArr) {
    // console.log('i', stopData)
    const stop = stopData[0].stopTitle
    const agency = stopData[0].agencyTitle

    if (!sortedByAgencyAndStopsObj[agency] ||
      sortedByAgencyAndStopsObj[agency].length === 0) {
      sortedByAgencyAndStopsObj[agency] = {}
    }

    for (let route of stopData) {
      // console.log('route', route)
      const name = route.stopTitle
      const line = route.routeTag

      if (!route.direction) {
        route.direction = {}
        route.direction.title = 'null'
        route.direction.prediction = 'null'
      }

      let direction = route.direction.title

      if (!sortedByAgencyAndStopsObj[agency][name]) {
        sortedByAgencyAndStopsObj[agency][name] = {}
      }
      if (!sortedByAgencyAndStopsObj[agency][name][line] ||
        !sortedByAgencyAndStopsObj[agency][name][line].length === 0) {
        sortedByAgencyAndStopsObj[agency][name][line] = []
      }

      if (route.direction.length) {
        // console.log('length', route.direction)

        for (let direction of route.direction) {
          // console.log('direcccion', direction)
          if (!sortedByAgencyAndStopsObj[agency][name][line][direction.title] ||
            !sortedByAgencyAndStopsObj[agency][name][line][direction.title].length === 0) {
            sortedByAgencyAndStopsObj[agency][name][line][direction.title] = []
          }
          sortedByAgencyAndStopsObj[agency][name][line][direction.title].push(direction.prediction)
        }
      } else {
        if (!sortedByAgencyAndStopsObj[agency][name][line][direction] ||
          !sortedByAgencyAndStopsObj[agency][name][line][direction].length === 0) {
          sortedByAgencyAndStopsObj[agency][name][line][direction] = []
        }
        sortedByAgencyAndStopsObj[agency][name][line][direction].push(route.direction.prediction)
      }
    }
  }

  return sortedByAgencyAndStopsObj

}

// render
const renderDataToDom = (sortedByAgencyAndStopsObj) => {
  // console.log('x', sortedByAgencyAndStopsObj)
  if (sortedByAgencyAndStopsObj["San Francisco Muni"]) {
    const stops = reverseObject(sortedByAgencyAndStopsObj["San Francisco Muni"])
    // header
    let html =
      `
      <div class="agency-container df fdc">
        <li class="df fdr transport-type-container">
        <div class="m16">
          <img class="transport-type-icon" src="static/front-bus.svg"/>

          <img class="transport-type-muni-logo" src="static/muni_logo.svg"/>
          </div>
        </li>
      `
    renderStopsAndVisits(html, stops, "#muni-data")
  }


  if (sortedByAgencyAndStopsObj.BA) {
    const stops = reverseObject(sortedByAgencyAndStopsObj.BA)
    // header
    let html =
      `
      <div class="agency-container df fdc">
        <li class="df fdr transport-type-container">
          <img class="transport-type-icon" src="static/train.svg"/>
          <img class="transport-type-bart-logo" src="static/bart_logo.svg"/>
        </li>
      `
    // <img class="transport-type-icon" src="static/bus.svg"/>
    // renderStopsAndVisits(html, stops, "#bart-data")
  }
}

const renderStopsAndVisits = (html, stops, divMount) => {
  // console.log('stops', stops)
  for (const stop in stops) {
    html += `<ul>
      ${getStop(stop)}
    `

    for (const line in stops[stop]) {
      const lineVisits = stops[stop][line]
      for (const dir in lineVisits) {
        const destinationName = 'destinanem'
        html +=
          `<li class="bb df fdr aic ${dir === 'null' ? 'hide' : 'show'}">
                <div class="df fdr jcsb ph16 w100">
                  <div class="df fdr aic">
                    <div class="line-number line-number-label-${line}">
              `

        html += `<h2 class="line-number-text">${line}</h2>`
        html +=
          `
                    </div>
                    <div class="df fdc">
                      <h2 class="">${dir}</h2>
                    </div>
                  </div>
                  <div class="df fdr aic">
              `

        for (const visits of lineVisits[dir]) {
          // console.log('vli', visits.length)

          for (let i = 0; i < visits.length; i++) {
            // console.log('ss', visits[i])
            const visit = visits[i]
            if (i < 2) {
              if (visit.minutes === "0") {
                html +=
                  `
                    <div class="arrival-time">
                      <h1 class="arrival-time-text" style="font-size:18px">Leaving</h1>
                    </div>`
              } else {
                html +=
                  `
                    <div class="arrival-time">
                      <h1 class="arrival-time-text">${visit.minutes}</h1>
                    </div>`
              }

            }
          }

        }

        html += `min</div></li>`
      }


    }
    html += `</ul>`

    $(divMount).html(html)

  }

}

const getStop =  (stop) => {
  if (stop === '24th St & Mission St') {
    return `<li class="stop" style="margin-top:7px">
              <h2 class="fwi pr">${stop} <span>&DoubleLongLeftRightArrow;</span></h2>
            </li>
          `
  } else {
    return `<li class="stop">
              <h2 class="fwi pr">${stop} <span style='position: absolute;font-size: 24px;bottom: -5px;margin-left: 5px;'>&DoubleUpDownArrow;</span></h2>
            </li>`
  }
}
const getAndRenderPhoto = async () => {
  // https://api.unsplash.com/

  const rawResponse = await fetch(
    `//api.unsplash.com/search/photos/?client_id=eeaf2366517e0de69aab6eb6e58b341633b96dedfb3c5bb24263163128953c83&page=1&query=sagrada-familia`
  )

  const jsonResponse = await rawResponse.json()
  // console.log(jsonResponse)
  // https://api.unsplash.com/search/photos?page=1&query=office
}

function reverseObject(object) {
  var newObject = {};
  var keys = [];

  for (var key in object) {
    keys.push(key);
  }

  for (var i = keys.length - 1; i >= 0; i--) {
    var value = object[keys[i]];
    newObject[keys[i]] = value;
  }

  return newObject;
}
