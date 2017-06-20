import React, {Component} from "react";
import _ from "underscore";
import Moment from "moment";
import { format } from "d3-format";
import PropTypes from 'prop-types';

// Pond
import { TimeSeries, TimeRange } from "pondjs";

// Imports from the charts library
import {ChartContainer, ChartRow, Charts, Resizable} from "react-timeseries-charts";
import  YAxis from "./customYAxis"
import ScatterChart from "./ScatterChart"

//React Widgets
import DropdownList from 'react-widgets/lib/DropdownList'

// Spotting data
const spotJSON = require('json!./sighting_data.json');
var series = null;


/////////////////constants////////////////////
const graphSize = 600;

/* ////////////////// README ///////////////////////////
this uses a modifed YAxis and ScatterChart source check out lquinn on github for the updated file

basic setup you must provide Scatter Chart a "width"(y width of a block) and a "endTime" column for it to work



KNOWN BUGS 
Yaxis fails to display names if they are not exactly spaced by tens this can be slightly mitigated 
	by increasing the height of the graph but that is not a solution as you scale up the number of 
	location your searching for
CSS files for the dropdown lists are still bugged ???

//////////////////////////////////////////////////////// */


/**
* This function takes in you JSON data and builds it to a scatter plot with slight varriations in height at random
* this varration makes the graph readable. This should be run everytime you change your data selection ie not render method
* It builds the points array and series stream 
*
* TLDR: Makes graph based on JSON data
*/
function buildChartData()
{

	const points = [];
	stateFill = [];
	var numOfStates = 0;

	_.each(spotJSON, elem => {
	


		if(!displayedSpecies.includes(elem.Species))
		{
			return;
		}
		const species = elem.Species;

		const time = new Moment(elem.StartTime).toDate().getTime();
		const endTime = new Moment(elem.StopTime).toDate().getTime();

		var height = -1;
		if(celloc.length == 0)
		{
			switch(currLevel){
				case 'COUNTRY' :
					var p = stateFill.indexOf(elem.Country);
					if(p < 0)
					{
						stateFill.push(elem.Country);
					}
					height = stateFill.indexOf(elem.Country) * 10 + 10;
					break;
				case 'STATE' :
					var p = stateFill.indexOf(elem.State);
					if(p < 0)
					{
						stateFill.push(elem.State);
					}
					height = stateFill.indexOf(elem.State) * 10 + 10;
					break;
				case 'CITY' :
					var p = stateFill.indexOf(elem.City);
					if(p < 0)
					{
						stateFill.push(elem.City);
					}
					height = stateFill.indexOf(elem.City) * 10 + 10;
					break;
			}
			
		}
		else
		{
			switch(currLevel){
				case 'COUNTRY' :
					height = switchOnSelected(elem.Country);
					break;
				case 'STATE' :
					height = switchOnSelected(elem.State);
					break;
				case 'CITY' :
					height = switchOnSelected(elem.City);
					break;
			}
		}
		const count = elem.Count;
		

//MATH for Rect width this is passed to the timeseries for use in the scatterchart.js
		var p = graphSize / (numberOfLocations + 1);
		var r = p / displayedSpecies.length;
		r = r > 10 ? 10:r;
		var py = 0;
		if(numberOfLocations > 7)
		{
			r = r/2;
			py = .5;
		}

		if(height > 0)
		{
			const color = mapSpeciesToColor(species);
			var dy =  (color)*r/10 + .01 + color*py;;
			points.push([
				time,
				endTime,
				r,
				height - dy,
				count,
				species,
				color
			]);

		}
	});


	points.sort(function(a,b){

		return a[0]-b[0];
	});


	series = new TimeSeries({
		name: "Locations",
		columns: ["time", "endTime", "width", "locNum", "count", "species", "color"],
		points
	});
	buildLabels();
}



/*
* Simply maps a given specie to a color for display
*
*/
var colorSpecies = [];
function mapSpeciesToColor(species)
{
	var p = colorSpecies.indexOf(species);
	if(p < 0)
	{
		colorSpecies.push(species);
		return colorSpecies.indexOf(species);
	}
	return p;

}

//access arrays
//These arrays store the bulk of all the input data 
var celloc = [];
var colorSpecies = [];
var displayedSpecies = ["Krowsti"]; //sample data
var currLevel = "COUNTRY";
var stateFill = []; //for use when celloc = [];
var numberOfLocations = 3;

/*runs the update button procedures first clear out color species
* find the number of location to render then run Build Chart Data to create the chart
*
* TLDR run this to remake the graph
*/
function rebuild()
{
	colorSpecies = [];

	numberOfLocations = celloc.length != 0 ? celloc.length :
		(currLevel == "CITY" ? CityArray.length :
			currLevel == "STATE" ? StateArray.length :
				CountryArray.length);

	buildChartData();
}



/*
* This makes labels for custum y axix simple it needs a index a y value to substitute and name for the state
* this must be include based on y Axis current edit
*
*/
var clabels = [];
function buildLabels()
{
	clabels = [];
	if(celloc.length == 0)
	{
		stateFill.forEach((elem,i) =>{
			clabels.push({sLen:i, sWidth: i*10+10, name:stateFill[i]});
		});
	}
	else
	{
		celloc.forEach((elem,i) =>{
			clabels.push({sLen:i, sWidth: i*10+10, name:celloc[i]});
		});
	}
}

/**
*	This function is just for mapping location to specfic Y value 
*	locations should be added to celloc or this will return zero and we are positive people
*
*	TLDR Location -> y Value
*/
function switchOnSelected(location)
{
	return celloc.indexOf(location) * 10 + 10;
}

//Colors!!!
var heat = [
			"#000000",
			"#ff0000",
			"#00ff00",
			"#0000ff",
			"#ffcf00",
			"#00ffff",
			"#ff00ff",
			"#f0f0f0",
			"#d33d00"
		];



//This is mostly from react-timeseries-chart windchart example just updated to a current class syntax
//with modifications check there first
class ScatterLocation extends Component {

	constructor(props){
		super(props);

		buildDataTypes();
		buildChartData();

		this.state = {

			hover: null,
			highlight: null,
			selection: null,
			timerange: series.range()
		};

		this.handleSelectionChanged = this.handleSelectionChanged.bind(this);
		this.handleMouseNear = this.handleMouseNear.bind(this);

	}

	handleSelectionChanged(point) {
		this.setState({
			selection: point
		});
	}

	handleMouseNear(point)
	{
		this.setState({
			highlight:point
		});
	}

	//picks the paramlist for the input
	choseShortList()
	{
		switch(currLevel){
			case 'COUNTRY' :
				return <SelectorMain data = {CountryArray} dataType = "loc"/>
			case 'CITY' :
				return <SelectorMain data = {CityArray} dataType = "loc"/>
			case 'STATE' :
				return <SelectorMain data = {StateArray} dataType = "loc"/>
		}
	}

	render() {
		const highlight = this.state.highlight;
		const formatter = format(".2f");
		let text = `Location: ,time: -:--`;
		let infoValues = [];
		if(highlight){
			const locNumber = `${formatter(
				highlight.event.get(highlight.column)
			)}`;
			const countText = `${formatter(
				highlight.event.get("count")
			)}`;
			var locationText = '';
			if(celloc.length == 0)
			{
				locationText = stateFill[Math.floor(locNumber/10)];
			}
			else
			{
				locationText = celloc[Math.floor(locNumber/10)];
			}

			text = `
				Time: ${this.state.highlight.event.timestamp().toLocaleTimeString()},
				Species: ${this.state.highlight.event.get("species")},
				Location: ${locationText}
			`;

			infoValues = [{label: "Loc", value: locationText},
							{label: "Count", value: countText}
						];
		}

		const perEventStyle = (column, event) => {
			if(event.get("color") > heat.length)
			{
				heat.push('#'+Math.floor(Math.random()*16777215).toString(16));
			}
			const color = heat[event.get("color")];
			return { 
				normal: {
					fill: color,
					opacity: 1.0
				},
				highlighted: {
					fill: color,
					stroke: "none",
					opacity: 1.0
				},
				selected: {
					fill: "none",
					stroke: "#2cb1cf",
					strokeWidth: 5,
					opacity: 1.0
				},
				muted: {
					fill: color,
					stroke: "none",
					opacity: 0.4
				}
			

			};
		};

		return ( 
			<div>
                <div className="row">
                    <div className="col-md-12">
                        {text}
                    </div>
                </div>

                <hr />

                <div className="row">
                    <div className="col-md-12">
                        <Resizable>
                            <ChartContainer
                                timeRange={this.state.timerange}
                                enablePanZoom={true}
                                onBackgroundClick={() =>
                                    this.setState({ selection: null })}
                                onTimeRangeChanged={timerange =>
                                    this.setState({ timerange })}
                            >
                                <ChartRow height={graphSize} debug={false}>
                                    <YAxis
                                        id="spot-lock"
                                        label="Location by Number"
                                        labelOffset={-10}
                                        min={0}
                                        max={series.max("locNum")}
                                        width="70"
                                        type="linear"
                                        format=".1f"
                                        customLabels={clabels}
                                    />
                                    <Charts>
                                        <ScatterChart
                                            axis="spot-lock"
                                            series={series}
                                            columns={["locNum"]}
                                            style={perEventStyle}
                                            info={infoValues}
                                            infoHeight={32}
                                            infoWidth={110}
                                            infoStyle={{
                                                fill: "black",
                                                color: "#DDD"
                                            }}
                                            format=".1f"
                                            selected={this.state.selection}
                                            onSelectionChange={
                                                (p) => this.handleSelectionChanged(p)
                                            }
                                            onMouseNear={(p) => this.handleMouseNear(p)}
                                            highlight={this.state.highlight}
                                        />
                                    </Charts>
                                </ChartRow>
                            </ChartContainer>
                        </Resizable>
                    </div>
                </div>
                <div>
		            <div id = "column-one" >
		                <button onClick = {() => {rebuild();  this.setState({selection: null}); }}>Update</button>
						<br />Click below for dropdown level select: <DropdownList 
							data = {LevelArray}
							value = {currLevel}
							onChange = {(value) => {currLevel = value; this.setState({selection: null}); changedLocFlag = 1}}
						/>
		              	{this.choseShortList()}
		          	</div>
		          	<div id = "column-two">
		          		<SelectorMain data = {SpeciesArray} dataType = "species"/>
		          	</div>
		          	<div id = "column-three">
		                <ScatterKey />
		          	</div>
            	</div>
            </div>
		);
	}
}

export default ScatterLocation;



//Arrays I need 
//level  -> single dropdown
// State Country City -> multiselect
// Species -> multiselect
var LevelArray = ["CITY", "COUNTRY","STATE"];
var StateArray = [];
var CountryArray = [];
var CityArray = [];
var SpeciesArray = [];
var changedLocFlag = 0;


//Short List 

const Place = ({ 
	id, 
	info, 
	handleFavourite 
}) => (
	<li
		onClick={() => {handleFavourite(id); console.log(id)}}>
		{info[1]}
	</li>
)

const ShortList = ({
	favourites,
	data,
	deleteFavourite,
	dataType
}) => {
	const hasFavourites = (favourites.length > 0)
	const favList = favourites.map((fav, i) => {
		return (
			<Place 
				id={i}
				key={i}
				info={data[fav]}
				handleFavourite={(id) => deleteFavourite(id)}
			/>
		)
	})
	return (
		<div className="favourites">
			<h4>
				{hasFavourites 
					? 'Your selected parameters'
					: 'Click on a ' + dataType + ' to add it..'
				}
			</h4>
			<ul>
				{favList}
			</ul>
			{hasFavourites && <hr/>}
		</div>
	)
}


const Places = ({ 
	data, 
	filter, 
	favourites, 
	addFavourite 
}) => { 
	const input = filter.toLowerCase()

	// Gather list of names
	const places = data
		// filtering out the names that...
		.filter((place, i) => {
			return (

				// ...are already favourited
				favourites.indexOf(place[0]) === -1
				// ...are not matching the current search value
				&& ( !place[1].toLowerCase().indexOf(input) )
			)
		})
		// ...output a <Name /> component for each name
		.map((place, i) => {
		// only display names that match current input string
			return (
				<Place 
					id={place[0]}
					key={i}
					info={place}
					handleFavourite={(id) => addFavourite(id)}
				/>
			)
		})
	
	/* ##### the component's output ##### */
	return ( 
		<ul> 
			{places}
		</ul>
	)
}

class Search extends Component {
	render() {
		const { filterVal, filterUpdate} = this.props
		return (
			<form>
				<input 
					type='text'
					ref='filterInput'
					placeholder='Type to filter..'
					// binding the input value to state
					value={filterVal}
					onChange={() => {
					 filterUpdate(this.refs.filterInput.value) 
					}}
				/> 
			</form>
		)
	}
}


class SelectorMain extends Component {
	constructor(props) {
		super(props)
		this.state = {
			filterText: '',
			favourites: []
		}
	}
	
	// update filterText in state when user types 
	filterUpdate(value) {
		this.setState({
			filterText: value
		});
	}
	
	// add clicked name ID to the favourites array
	addFavourite(id) {
		const newSet = this.state.favourites.concat([id])
		this.setState({
			favourites: newSet
		});
	}
	
	// remove ID from the favourites array
	deleteFavourite(id) {
		const { favourites } = this.state
		const newList = [
			...favourites.slice(0, id),
			...favourites.slice(id + 1)
			]
		this.setState({
			favourites: newList
		})
	}
	
	componentWillUpdate(nextProps, nextState){

		if(changedLocFlag == 1)
		{
			this.setState({favourites: []});
			changedLocFlag = 0;
		}
	}

	updateBackendData()
	{
		if(this.props.dataType == "loc")
		{
			celloc = locationIndexToCompleteArray(this.state.favourites);
		}
		else if(this.props.dataType == "species")
		{
			displayedSpecies = displayedSpeciesIndexsToComplete(this.state.favourites);
		}
	}


	render() {
		const hasSearch = this.state.filterText.length > 0;

		this.updateBackendData();
		
		return ( 
			<div>
				<header>
					<Search
						filterVal={this.state.filterText}
						filterUpdate={this.filterUpdate.bind(this)}
					/> 
				</header>
				<main>
				
					<ShortList 
						data={this.props.data} 
						favourites={this.state.favourites}
						deleteFavourite={this.deleteFavourite.bind(this)}
						dataType = {this.props.dataType}
					/>

					<Places 
						data={this.props.data}
						filter={this.state.filterText}
						favourites={this.state.favourites}
						addFavourite={this.addFavourite.bind(this)}
					/>
					{/* 
						Show only if user has typed in search.
						To reset the input field, we pass an 
						empty value to the filterUpdate method
					*/}
					{hasSearch &&
						<button
							onClick={this.filterUpdate.bind(this, '')}>
							Clear Search
						</button>
					}

				</main>
			</div>
		)
	}
}

const DATA_TYPE = [] // {ID, NAME, TYPE}
function buildDataTypes()
{
	StateArray = [];
	CountryArray = [];
	CityArray = [];
	SpeciesArray = [];

	_.each(spotJSON, elem => {
		var p = SpeciesArray.indexOf(elem.Species);
		if(p < 0)
		{
			SpeciesArray.push(elem.Species);
		}
		p = CountryArray.indexOf(elem.Country);
		if(p < 0)
		{
			CountryArray.push(elem.Country);
		}
		p = CityArray.indexOf(elem.City);
		if(p < 0)
		{
			CityArray.push(elem.City);
		}
		p = StateArray.indexOf(elem.State);
		if(p < 0)
		{
			StateArray.push(elem.State);
		}
	});


	StateArray = indexArray(StateArray);
	CityArray = indexArray(CityArray);
	CountryArray = indexArray(CountryArray);
	SpeciesArray = indexArray(SpeciesArray);

}


function indexArray(arr)
{
	var temp = []
	var i = 0;
	arr.map((val) => {
		temp.push([i++, val]);
	});
	return temp;
}

function displayedSpeciesIndexsToComplete(disp)
{
	var temp = [];
	disp.map((index) => {
		temp.push(SpeciesArray[index][1]);
	});
	return temp;
}

function locationIndexToCompleteArray(arr)
{
	var temp = [];
	switch(currLevel)
	{
		case 'COUNTRY' :
			arr.map((index) => {
				temp.push(CountryArray[index][1]);
			});
			break;
		case 'CITY' :
			arr.map((index) => {
				temp.push(CityArray[index][1]);
			});
			break;
		case 'STATE' :
			arr.map((index) => {
				temp.push(StateArray[index][1]);
			});
			break;
	}

	return temp;
}


class ScatterKey extends Component
{
	constructor(props) 
	{
		super(props)
	}


	createKeyForSpecies()
	{
		return displayedSpecies.map((color, i) => {
			return (
				<li key = {i} id = {i} style = {{color : heat[i] }} > {displayedSpecies[i]} </li>
				);

			});

	}
	createKeyForLocations()
	{
		if(celloc.length == 0)
		{celloc = stateFill}
		return celloc.reverse().map((loc, i) => {
			
			return (
				<li key = {i} id = {i}> y = {(celloc.length  - i - 1)*10 + 10}: {loc} </li>
				);

			});
	}


	render()
	{
		const stateFillingFlag = celloc.length == 0 ? 1:0;
		if(stateFillingFlag)
		{
			celloc = stateFill;
		}
		const dist = this.createKeyForLocations();
		celloc.reverse();
		if(stateFillingFlag)
		{
			celloc = [];
		}

		return (
			<div>
				ScatterKey For Species
				<ul>
					{this.createKeyForSpecies()}
				</ul>
				ScatterKey For Locations
				<ul>
					{dist}
				</ul>	
			</div>

		);
	}
}

