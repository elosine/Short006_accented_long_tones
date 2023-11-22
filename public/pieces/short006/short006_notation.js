//#ef NOTES
/*
Generate Curve Upstroke
Make 1 staff of Curves
Make curves for all staves

Rethink the Timing Clock
  Curve will last x number of frames and begin on a certain frame
  Each frame in curve life will have an x and y location
    Generate Curve
    Calculate curve start as frame number
    Calculate duration of curve in number of frames
    Use number of pixels per frame to find curve x index and look up y and store coordinates


Draw curve with new timeline

Shore up timeline:
  Base counter will be frames
  Array with the total number of frames in a timeline
  Each index (i.e. frame) will contain:
    elapsed time in MS
    X location in pixels

Make one curve follower and test curve amount and width/duration
Array the same length as timelineFRAMES for Curves
  Generate 2 Curves: onset time; descent exponent; ascent exponent
  look at current curve
  Each curve has its Y location in this array
  Otherwise at top
Fix Animation Engine for Scrolling Cursors to Frame clock
Curve Follower from sf004
Doesn't need to be perfect just needs to run
*/
//#endef NOTES

//#ef GLOBAL VARIABLES

//#ef General Variables
let NUM_PLAYERS = 4;
const TEMPO_COLORS = [clr_brightOrange, clr_brightGreen, clr_brightBlue, clr_lavander, clr_darkRed2];
//#endef General Variables

//##ef Timing
const FRAMERATE = 60;
const FRAMES_PER_MS = FRAMERATE / 1000;
let FRAMECOUNT = 0;
const PX_PER_SEC = 30; //scrolling speed
const PX_PER_MS = PX_PER_SEC / 1000;
const MS_PER_PX = 1000 / PX_PER_SEC;
const PX_PER_FRAME = PX_PER_SEC / FRAMERATE;
const MS_PER_FRAME = 1000.0 / FRAMERATE;

//##endef Timing

//#ef Animation Engine Variables
let cumulativeChangeBtwnFrames_MS = 0;
let epochTimeOfLastFrame_MS;
let animationEngineCanRun = true;
//#endef END Animation Engine Variables

//#ef TIMESYNC
const TS = timesync.create({
  server: '/timesync',
  interval: 1000
});
//#endef TIMESYNC

//#ef World Panel Variables
let worldPanel;
const DEVICE_SCREEN_W = window.screen.width;
const DEVICE_SCREEN_H = window.screen.height;
const MAX_W = 1280; //16:10 aspect ratio; 0.625
const MAX_H = 720;
const WORLD_MARGIN = 10;
const WORLD_W = Math.min(DEVICE_SCREEN_W, MAX_W) - (WORLD_MARGIN * 2);
const WORLD_H = Math.min(DEVICE_SCREEN_H, MAX_H) - 45;
const WORLD_CENTER = WORLD_W / 2;
const GAP = 6;
//#endef World Panel Variables

//#ef Canvas Variables
const NOTATIONCANVAS_TOP = 0;
const NOTATIONCANVAS_H = WORLD_H;
const NOTATIONCANVAS_W = WORLD_W;
//#endef Canvas Variables

//#ef Scrolling Bouncy Balls
let scrBBs = [];
const scrBB_RADIUS = 7;
//#endef Scrolling Bouncy Balls

//#ef Staff Variables
const NUMSTAVES = 4;
const STAFFGAP = 4;
const STAFF_H = (NOTATIONCANVAS_H - (STAFFGAP * (NUMSTAVES - 1))) / NUMSTAVES;
const STAFF_W = NOTATIONCANVAS_W;
let staves = [];
//#endef Staff Variables

//#ef Staff Timing
//find out how many frames in a timeline
const STAFF_WIDTH_IN_FRAMES = Math.round(STAFF_W / PX_PER_FRAME); //Width of the staff in frames
let timelineFRAMES = [];
//which frame for each MS
const STAFF_WIDTH_IN_MS = Math.round(STAFF_W / PX_PER_MS); //Width of the staff in frames
let timelineMS_returnsFrames = [];
for (var i = 0; i < STAFF_WIDTH_IN_MS; i++) {
  let tFrameNum = Math.round(FRAMES_PER_MS * i);
  timelineMS_returnsFrames.push(tFrameNum);
}

//Should contain an index for each frame in the timeline
for (var i = 0; i < STAFF_WIDTH_IN_FRAMES; i++) {
  let tFrameDict = {}; //a dictionary for each frame
  let tpx = Math.round(i * PX_PER_FRAME); //this is the pixel location for each frame
  tFrameDict['x'] = tpx;
  let tMS = Math.round(i * MS_PER_FRAME);
  tFrameDict['ms'] = tMS;
  tFrameDict['crvY'] = scrBB_RADIUS;
  timelineFRAMES.push(tFrameDict);
}
//#endef Staff Timing

//#ef Scrolling Tempo Cursors
let scrollingCursors = [];
//#endef Scrolling Tempo Cursors

//#ef Curves
let crvYcoords = [timelineFRAMES.length]; //array with an index for each frame of the timeline which will contain the Y coordinate of the curve;
for (var i = 0; i < timelineFRAMES.length; i++) { //initialize all with BB at the top;
  crvYcoords.push(scrBB_RADIUS);
}
//#endef Curves

//#endef GLOBAL VARIABLES

//#ef INIT
function init() {

  makeWorldPanel();
  makeStaves();
  makeScrollingCursors();
  makeScrollBBs();
  makeCurves();

  let ts_Date = new Date(TS.now()); //Date stamp object from TimeSync library
  let tsNowEpochTime_MS = ts_Date.getTime();
  epochTimeOfLastFrame_MS = tsNowEpochTime_MS;
  requestAnimationFrame(animationEngine); //kick off animation

} // function init() END
//#endef INIT

//#ef BUILD WORLD


//#ef Make World Panel - floating window made in jspanel
function makeWorldPanel() {
  worldPanel = mkPanel({
    w: WORLD_W,
    h: WORLD_H,
    title: 'SoundFlow #5',
    onwindowresize: true,
    clr: 'none',
    ipos: 'center-top',
  });

  worldPanel.content.addEventListener('click', function() {
    document.documentElement.webkitRequestFullScreen({
      navigationUI: 'hide'
    });
  });

} // function makeWorldPanel() END
//#endef Make World Panel

//#ef Make Staves - SVG rectangle for each individual staff (draw notation on top)
function makeStaves() {

  for (var i = 0; i < NUMSTAVES; i++) {
    let tStaffObj = {}; //{div:,svg:,rect:}
    let ty = i * (STAFF_H + STAFFGAP);

    let tDiv = mkDiv({
      canvas: worldPanel.content,
      w: STAFF_W,
      h: STAFF_H,
      top: ty,
      left: 0,
      bgClr: clr_blueGrey
    });

    tStaffObj['div'] = tDiv;

    let tSvg = mkSVGcontainer({
      canvas: tDiv,
      w: STAFF_W,
      h: STAFF_H,
      x: 0,
      y: 0,
      clr: clr_blueGrey
    });

    tStaffObj['svg'] = tSvg;

    tStaffObj['rect'] = mkSvgRect({
      svgContainer: tSvg,
      x: 0,
      y: 0,
      w: STAFF_W,
      h: STAFF_H,
      fill: 'black',
      stroke: 'black',
      strokeW: 0,
      roundR: 0
    });

    staves.push(tStaffObj);

  } // for (var i = 0; i < NUMSTAVES; i++) END

} // function makeStaves() END
//#endef Make Staves

//#ef Make Scrolling Tempo Cursors
function makeScrollingCursors() {

  for (let scrollingCsrIx = 0; scrollingCsrIx < NUM_PLAYERS; scrollingCsrIx++) {

    let tLine = mkSvgLine({
      svgContainer: staves[scrollingCsrIx].svg,
      x1: 0,
      y1: STAFF_H,
      x2: 0,
      y2: 0,
      stroke: TEMPO_COLORS[scrollingCsrIx],
      strokeW: 3
    });
    tLine.setAttributeNS(null, 'stroke-linecap', 'round');
    // tLine.setAttributeNS(null, 'transform', "translate(" + beatCoords[4].x.toString() + "," + beatCoords[4].y.toString() + ")");
    scrollingCursors.push(tLine);

  } //for (let scrollingCsrIx = 0; scrollingCsrIx < NUM_TEMPOS; scrollingCsrIx++) END

} // function makeScrollingCursors() END
//#endef Make Scrolling Tempo Cursors

//#ef Make Curves
function makeCurves() {
  //GEnerate start time and duration
  // start sec 3, duration 1.5 seconds
  //Calculate # of pixels based on duration
  let crvWidthPixels = Math.round(1.5 * PX_PER_SEC);
  //Generate Curve of crvWidthPixels; each index has x and y
  var crvCoords = plot(function(x) { //generate curve
    return Math.pow(x, 0.5); //Math.pow(x, 1.5) the 1.5 here is the curve shape; >1 slow curve at beginning, faster curve at end; <1 opposite
  }, [0, 1, 1, 0], crvWidthPixels, STAFF_H); // [0, 1, 1, 0], 150, STAFF_H) 150 is width of the curve; generates array with size 150

  let crvStartTimeMS = 3000;
  let crvStartFrameNumber = Math.round(crvStartTimeMS / MS_PER_FRAME); //find out which frame the curve starts on and look up the x-pixel in timelineFrames;
  let crvDurFrames = Math.round(1.5 * FRAMERATE);
  //let crvStartX = timelineFRAMES[crvStartFrameNumber].x;

  //add y coordinate of curve to timelineFRAMES
  // each x convert to framenumber
  // add start frame number
  // frame i * frames per pixel = crvCoords ix
  for (var i = 0; i < crvDurFrames; i++) {
    let tframeNum = crvStartFrameNumber + i;
    let tLookUpPixel = Math.min(Math.round(i * PX_PER_FRAME), crvCoords.length - 1);
    console.log(tLookUpPixel);
    let tCrvY = crvCoords[tLookUpPixel].y;
    timelineFRAMES[tframeNum].crvY = tCrvY;
  }

  //Draw Curve
  let crvStartX = crvStartTimeMS * PX_PER_MS;
  var tSvgCrv = document.createElementNS(SVG_NS, "path");
  var tpathstr = "";

  for (var i = 0; i < crvCoords.length; i++) {
    let tcrvX = crvStartX + crvCoords[i].x;
    if (i == 0) {
      tpathstr = tpathstr + "M" + tcrvX.toString() + " " + crvCoords[i].y.toString() + " ";
    } else {
      tpathstr = tpathstr + "L" + tcrvX.toString() + " " + crvCoords[i].y.toString() + " ";
    }
  }

  tSvgCrv.setAttributeNS(null, "d", tpathstr);
  tSvgCrv.setAttributeNS(null, "stroke", "rgba(255, 21, 160, 0.5)");
  tSvgCrv.setAttributeNS(null, "stroke-width", "4");
  tSvgCrv.setAttributeNS(null, "fill", "none");
  // tSvgCrv.setAttributeNS(null, "transform", "translate( 100, 20)");
  staves[0].svg.appendChild(tSvgCrv);

}
//#endef Make Curves

//#ef Make Cursor Bouncy Ball
function makeScrollBBs() {

  for (let scrollBBsIx = 0; scrollBBsIx < NUM_PLAYERS; scrollBBsIx++) {

    let tBB = mkSvgCircle({
      svgContainer: staves[scrollBBsIx].svg,
      cx: 0,
      cy: scrBB_RADIUS,
      r: scrBB_RADIUS,
      fill: TEMPO_COLORS[scrollBBsIx],
      stroke: 'white',
      strokeW: 0
    });
    scrBBs.push(tBB);

  } // END for (let scrollBBsIx = 0; scrollBBsIx < NUM_PLAYERS; scrollBBsIx++) {

} //function makeScrollBBs() END
//#endef Make Cursor Bouncy Ball

//#ef Make Cursor Bouncy Ball Curve Follower
function makeBBcrvFollower() {

  for (let scrollBBsIx = 0; scrollBBsIx < NUM_PLAYERS; scrollBBsIx++) {

    let tBB = mkSvgCircle({
      svgContainer: staves[scrollBBsIx].svg,
      cx: 0,
      cy: scrBB_RADIUS,
      r: scrBB_RADIUS,
      fill: TEMPO_COLORS[scrollBBsIx],
      stroke: 'white',
      strokeW: 0
    });
    scrBBs.push(tBB);

  } // END for (let scrollBBsIx = 0; scrollBBsIx < NUM_PLAYERS; scrollBBsIx++) {

} //function makeBBcrvFollower() END
//#endef Make Cursor Bouncy Ball Curve Follower


//#endef BUILD WORLD

//#ef WIPE/UPDATE/DRAW


//###ef updateScrollingCsrs
function updateScrollingCsrs() {

  let timelineFrameIx = FRAMECOUNT % timelineFRAMES.length;
  let currScrollingCsrX = timelineFRAMES[timelineFrameIx].x;

  for (let playerIX = 0; playerIX < NUM_PLAYERS; playerIX++) {

    scrollingCursors[playerIX].setAttributeNS(null, 'x1', currScrollingCsrX);
    scrollingCursors[playerIX].setAttributeNS(null, 'x2', currScrollingCsrX);

    scrBBs[playerIX].setAttributeNS(null, 'cx', currScrollingCsrX);
    scrBBs[playerIX].setAttributeNS(null, 'cy', timelineFRAMES[timelineFrameIx].crvY); //updates y coordinate of BB from crvYcoords

  } // end for (let scrollingCsrIx = 0; scrollingCsrIx < scrollingCursors.length; scrollingCsrIx++)

} // function updateScrollingCsrs() END
//###endef updateScrollingCsrs


//#endef WIPE/UPDATE/DRAW

//#ef ANIMATION


//#ef Animation Engine
function animationEngine(timestamp) { //timestamp not used; timeSync server library used instead

  let ts_Date = new Date(TS.now()); //Date stamp object from TimeSync library
  let tsNowEpochTime_MS = ts_Date.getTime();
  cumulativeChangeBtwnFrames_MS += tsNowEpochTime_MS - epochTimeOfLastFrame_MS;
  epochTimeOfLastFrame_MS = tsNowEpochTime_MS; //update epochTimeOfLastFrame_MS for next frame

  while (cumulativeChangeBtwnFrames_MS >= MS_PER_FRAME) { //if too little change of clock time will wait until 1 animation frame's worth of MS before updating etc.; if too much change will update several times until caught up with clock time

    if (cumulativeChangeBtwnFrames_MS > (MS_PER_FRAME * FRAMERATE)) cumulativeChangeBtwnFrames_MS = MS_PER_FRAME; //escape hatch if more than 1 second of frames has passed then just skip to next update according to clock
    wipe();
    update();
    draw();

    FRAMECOUNT++;
    cumulativeChangeBtwnFrames_MS -= MS_PER_FRAME; //subtract from cumulativeChangeBtwnFrames_MS 1 frame worth of MS until while cond is satisified

  } // while (cumulativeChangeBtwnFrames_MS >= MS_PER_FRAME) END

  if (animationEngineCanRun) requestAnimationFrame(animationEngine); //animation engine gate: animationEngineCanRun

} // function animationEngine(timestamp) END
//#endef Animation Engine END

//#ef WIPE/UPDATE/DRAW

//#ef Wipe Function
function wipe(epochClock_MS) {

} // function wipe() END
//#endef Wipe Function

//#ef Update Function
function update() {

  updateScrollingCsrs();

}
//#endef Update Function

//#ef Draw Function
function draw(epochClock_MS) {

}
//#endef Draw Function

//#endef WIPE/UPDATE/DRAW


//#endef ANIMATION





//
