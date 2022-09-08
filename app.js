/**
 * TO-DO! 
 * [✅] Sync with Github
 * [✅] Add models to Object for better rendering/handling
 * [ ] convert tables to grids
 * [✅] Heatmap for seating flows
 * [ ] Add charts
 * [ ] Show/hide models
 * [ ] Show/hide flows
**/

// grab the table to display the models in
let pacingTable = document.querySelector('#pacing-table')
let settingsTable = document.querySelector('#settings-table')

// create our object and load some basic settings
let venueSettings = {
    turns: 2.5,
    capacity: 215,
    duration: 2,
    openingTime: 61200,
    seatingIntervals: 18,
    coverTarget: 537.5
}

// listen for the user changing settings and save them to local storage
settingsTable.addEventListener('change', e => {
    let changedValue = e.target.value
    let changedKey = e.target.parentElement.id
    
    if (changedKey === "openingTime") {
        let hhmm = changedValue.split(":")
        changedValue = (hhmm[0] * 3600) + (hhmm[1] * 60)
        venueSettings[changedKey] = changedValue
    } else {
        changedValue = Number(changedValue)
        venueSettings[changedKey] = changedValue
    }

    if (changedKey === "turns") {
        venueSettings.coverTarget = venueSettings.capacity * changedValue
    }

    if (changedKey === "capacity") {
        venueSettings.coverTarget = venueSettings.turns * changedValue
    }

    if (changedKey === "coverTarget") {
        venueSettings.turns = (changedValue / venueSettings.capacity) 
    }

    window.localStorage.removeItem('user')
    window.localStorage.setItem('settings', JSON.stringify(venueSettings))

    updateTables()
})

pacingTable.addEventListener('change', e => {
    let changedValue = Number(e.target.value)
    let cell = e.target.parentNode

    let index = Array.prototype.indexOf.call(cell.parentNode.children, cell) - 1
    console.log(index)

    let modelName = e.target.getAttribute("data-model-name")
    console.log(modelName)

    if (modelName === "Custom") {
        models.customSeating[index] = changedValue
    }
    console.log(index)
    updateTables()
})

// create arrays to store our models

let models = {
    seatingLabels: {
        type: "label",
        title: "Time",
        data: [],
    },
    flatSeating: {
        type: "model",
        title: "Flat",
        data: [],
        flow: []
    },
    setSeating: {
        type: "model",
        title: "Set",
        data: [],
        flow: []
    },
    customSeating: {
        type: "model",
        title: "Custom",
        data: [],
        flow: []
    },
}

// display our initial settings
function displaySettings () {
    for (let [key, value] of Object.entries(venueSettings)) {
        let keyName = settingsTable.querySelector(`#${key}`)
        if (key === "openingTime") {
            value = new Date(value * 1000).toISOString().substr(11, 5)
        }
        keyName.firstChild.value = value
    }
}

// generate the labels for each interval and store them in an array
function generateLabels (openingTime, seatingIntervals) {
    models.seatingLabels.data = []
    for (let i = -1; i < seatingIntervals; i++ ) {
        let seconds = openingTime + (900 * i)
        let timeString = new Date(seconds * 1000).toISOString().substr(11, 5)
        models.seatingLabels.data.push(timeString)
    };   
}

// generate the values for our flat seating and store them in an array
function flatSeatingGen (capacity, duration, seatingIntervals) {
    models.flatSeating.data = [0];
    for (let i = 0; i < seatingIntervals; i++) {
        models.flatSeating.data.push(Math.floor(capacity / (duration * 4)))
    }
}

// generate the values for our set seating and store them in an array
function setSeatingGen (capacity, duration, seatingIntervals) {
    models.setSeating.data = [0];
    for (let i = 0; i < seatingIntervals; i++) {
        // calcuate the index of the seating in the interval
        let intervalIndex = calcIntIndex(i, duration)

        let turnsRemaining = calcTurnsRemaining(i, duration)
        let val
        
        // if all turns are completed, return 0
        if (turnsRemaining <= 0) {
            val = 0
        // if there is only a partial turn remaining, return the capacity 
        // multiplied by the number of turns 
        } else if (turnsRemaining < 1 && intervalIndex === 0) {
            val = capacity * turnsRemaining
        // if it's the first seating in the interval, fill the venue! 
        } else if (intervalIndex === 0) {
            val = capacity
        // at all other times, return 0
        } else {
            val = 0
        }

        models.setSeating.data.push(Math.floor(val))
    }
}

function customSeatingGen(seatingIntervals) {
    for (let i = 0; i < seatingIntervals; i++) {
        models.customSeating.data.push(0)
    }
}

function calcIntIndex (index, duration) {
    return index % (duration * 4)
}

function calcTurnsRemaining (index, duration)  {
    return venueSettings.turns - Math.floor(index/(duration * 4))
}

// 🚨 todo - update to Object model
function createServiceFlow (model) {
    let serviceFlow = []
    for (let i = 0; i<model.length; i++) {
        
        let firstSeatinginInt

        if (i < venueSettings.duration * 4 ) {
            firstSeatinginInt = 0
        } else {
            firstSeatinginInt = i - (venueSettings.duration * 4) +1
        }

        // create an array of the seatings still in session
        let currentSeatingIntervals = model.slice(firstSeatinginInt, i+1)

        // sum together the seatings
        let seatsFilled = currentSeatingIntervals.reduce((total, value) => total + value, 0)

        serviceFlow.push(seatsFilled)
        
    }
   // needs to be updated to match new function 
   createTableRow(pacingTable, "Flow", serviceFlow, "flow")
}

// creates a table row for a set of data
function createTableRow (key, parent) {
    
    // create new containers for the row and the header cell 
    let row = document.createElement('div')
    let header = document.createElement('div')
    
    row.classList.add("vertical-row", models[key].type)
    header.classList.add("header", "vertical-data", models[key].type)
    
    parent.appendChild(row)
    row.appendChild(header)
    header.innerHTML = models[key].title
    
    // create a cell for each of our seating intervals
    for (let i=0; i < venueSettings.seatingIntervals; i++) {
        
        let dataPoint = document.createElement('div')
        row.appendChild(dataPoint)
        dataPoint.classList.add('vertical-data', models[key].type)
        
        // add the heatmap background colour
        if (models[key].type === "flow") {
            let colourTemp = heatMapColorforValue(data[i])
            dataPoint.style.backgroundColor = colourTemp
            
            if (data[i] > venueSettings.capacity) {
                dataPoint.style.border = "1px solid red"
            }
        }

        // fill the cell with an input, with the value from the model
        dataPoint.innerHTML = `<input class="${models[key.type]}" data-model-name="${key}" value=${models[key].data[i]}></input>`
    }
}

function heatMapColorforValue(value) {
    let h 
    if (value <= venueSettings.capacity ) {
        h = (value) / venueSettings.capacity * 120
    } else {
        h = 120
    }
    return "hsl(" + h + ", 60%, 75%)";
  }

// save the default settings to local storage
if (window.localStorage.length === 0) {
    window.localStorage.setItem('settings', JSON.stringify(venueSettings))
} else {
    venueSettings = JSON.parse(window.localStorage.getItem('settings'))
}

function updateTables () {
    displaySettings()

    generateLabels(venueSettings.openingTime, venueSettings.seatingIntervals)
    flatSeatingGen(venueSettings.capacity, venueSettings.duration, venueSettings.seatingIntervals)
    setSeatingGen(venueSettings.capacity, venueSettings.duration, venueSettings.seatingIntervals)
    customSeatingGen(venueSettings.seatingIntervals)
    
    pacingTable.innerHTML = ""
    createTableRow(pacingTable, "Time", models.seatingLabels.data, "label")

    createTableRow(pacingTable, "Flat", models.flatSeating.data, "model")
    createServiceFlow(models.flatSeating.data)

    createTableRow(pacingTable, "Set", models.setSeating.data, "model")
    createServiceFlow(models.setSeating.data)

    createTableRow(pacingTable, "Custom", models.customSeating.data, "model")
    createServiceFlow(models.customSeating.data)
}

function refreshTables () {
    // display settings
    displaySettings() 

    // populate our models object
    generateLabels(venueSettings.openingTime, venueSettings.seatingIntervals)
    flatSeatingGen(venueSettings.capacity, venueSettings.duration, venueSettings.seatingIntervals)
    setSeatingGen(venueSettings.capacity, venueSettings.duration, venueSettings.seatingIntervals)
    customSeatingGen(venueSettings.seatingIntervals)

    // clear the pacing table
    pacingTable.innerHTML = ""

    // for each of our models, add them as sections to the table
    for (const [key, value] of Object.entries(models)) {
        
        // add the section
        let modelParent = document.createElement('div')
        modelParent.classList.add("parent", models[key].type, key)
        pacingTable.appendChild(modelParent)
        
        // create columns for the model and the flow
        createTableRow (pacingTable, key, modelParent)
    }
}



refreshTables()
