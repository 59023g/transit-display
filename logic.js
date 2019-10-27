const dev = true

// const apiKey511 = '11ae2c20-9586-4723-816a-33d342c0ce42' LIVE

const apiKey511 = 'a6fa9b93-36f7-4a45-9e4c-d35d6a841e82'
  // http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=sf-muni&stopId=13476

// https://gist.github.com/grantland/7cf4097dd9cdf0dfed14

const stops = [{
    id: '13476',
    agency: 'sf-muni'
  }, // https://sfbaytransit.org/24th-st-mission-st-west // 12, 48, 67
  {
    id: '13477',
    agency: 'sf-muni'
  }, // https://sfbaytransit.org/24th-st-mission-st-east // 12, 48
  {
    id: '15566',
    agency: 'sf-muni'
  }, // https://sfbaytransit.org/mission-st-24th-st-south // 14, 14R, 49, 714
  {
    id: '15565',
    agency: 'sf-muni'
  } // https://sfbaytransit.org/mission-st-24th-st-north // 14, 14R, 49, 714
  // { id: '24TH',  agency: 'BA' }   // 24thBart // 98?, 97?
]

let now
let init = false

// init
window.onload = async() => {
  setInterval(timerEvents, 1000)
    // await getAndRenderPhoto()


}

const timerEvents = async() => {
  setDomTime()

  // side effect here w/now
  let count = now.getSeconds()

  if (count === 0 || !init) {
    await getRenderBartData(count)
    await getRenderMuniData(count)
    init = true
  }

  if (count === 15 || count === 30 || count === 45) {
    // await getRenderBartData(count)
    // await getRenderBartData(count)

  }
}

const getRenderBartData = async(count) => {
  console.log(`Fetching BART: ${count}`)
  $("#bart-loading").html("<div>Request</div>")
  const rawBartDataJson = async() => {
    if (dev) {
      return JSON.parse(window.bartData)
    }
    return await getBartData()
  }

  const parsedBartDataJson = parseBartData(await rawBartDataJson())
  console.log('BART: ', parsedBartDataJson)
  renderBartDataDom(parsedBartDataJson)
  $("#bart-loading").html("")

}

const getRenderMuniData = async(count) => {
  console.log(`Fetching MUNI ${count}`)
  $("#muni-loading").html("<div>Request</div>")

  try {
    const rawDataString = async() => {
      // if (dev) {
      //   return window.data
      // }
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
const getBartData = async() => {
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

      var el = station.platforms[estimate.platform].filter(function(el) {
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

      station.platforms[estimate.platform].sort(function(a, b) {
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
      <h2>${parsedBartDataJson.name}</h2>
    </li>
  `

  for (const platform in platforms) {
    html += `<li class="bb"><div class="df">Platform ${platform}</div></li>`

    for (const train of platforms[platform]) {
      html +=
        `<li class="bb">
          <div class="df fdr jcsb ph16">
            <div class="df fdr">
              <div id='line-label' class="line-number line-number-label"
                style="background:${train.color}">
              </div>
              <div class="df fdc">
                <h2 class="">${train.destination}</h2>
                <h2 class="fwi" id='dir'>${train.dir}</h2>
              </div>
            </div>
            <div class="df fdr">
        `

      for (const estimate of train.estimate) {
        html +=
          `
          <div class="arrival-time">
            <h2 class="arrival-time-text">${estimate.minutes}</h2>
          </div>`

      }
      html += `min</div></li>`

    }

  }

  $("#bart-data").html(html)

}


// update now, every second
// also updates timer, and clock
const setDomTime = () => {
  // get time in correct format
  const getTime = () => {
    now = new Date()
    if (dev) {
      now = new Date('2019-09-28T19:13:38Z')
    }
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
const getStopDataNextbus = async() => {
  let jsonResponseArr = []
  for await (let stop of stops) {
    const rawResponse = await fetch(
      `//webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=${stop.agency}&stopId=${stop.id}`
    )
    const jsonResponse = await rawResponse.json()
    jsonResponseArr.push(jsonResponse.predictions)
  }
  return JSON.stringify(jsonResponseArr)
}


// parse a dreadful API response so I can use in DOM
const parseData = (rawDataString) => {
  console.log('raw', JSON.parse(rawDataString))
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
    <li class="stop">
      <h2>${stop}</h2>
    </li>
  `

    for (const line in stops[stop]) {
      const lineVisits = stops[stop][line]
        // console.log('line', line)

      for (const dir in lineVisits) {
        // console.log('dir', dir, lineVisits[dir])

        const destinationName = 'destinanem'
          // lineVisits[dir][0].MonitoredVehicleJourney.DestinationName

        html +=
          `<li class="bb ${dir === 'null' ? 'hide' : 'show'}">
                <div class="df fdr jcsb ph16">
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
            console.log('ss', visits[i])
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

const getAndRenderPhoto = async() => {
  // https://api.unsplash.com/

  const rawResponse = await fetch(
    `//api.unsplash.com/search/photos/?client_id=eeaf2366517e0de69aab6eb6e58b341633b96dedfb3c5bb24263163128953c83&page=1&query=sagrada-familia`
  )

  const jsonResponse = await rawResponse.json()
    // console.log(jsonResponse)
    // https://api.unsplash.com/search/photos?page=1&query=office
}

const calculateFutureArrival = (now, arrivalTime) => {
  const parsedNow = Date.parse(now)
  const parsedArrivalTime = Date.parse(arrivalTime)

  console.log(parsedNow, parsedArrivalTime)
  const timeToArrivalInMinutes = (parsedArrivalTime - parsedNow) / 60000
    // console.log(parsedNow, parsedArrivalTime, parsedArrivalTime - parsedNow)
    // console.log(now, arrivalTime, timeToArrivalInMinutes)
  return Math.floor(timeToArrivalInMinutes)
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
