import React, { Component } from 'react';
import { Segment, Container, Statistic, Progress, Divider, Grid, Label } from 'semantic-ui-react';

const phases = {
    monitor: {
        start: 5
    },
    accelerate: {
        start: 10
    },
    entangle: {
        start: 15
    },
    search: {
        start:20
    },
    link: {
        start:32
    },
    connected: {
        start: 50
    }
};

phases.monitor.next = phases.accelerate;
phases.accelerate.next = phases.entangle;
phases.entangle.next = phases.search;
phases.search.next = phases.link;
phases.link.next = phases.connected;

const schedules = {
    strength: {
        phase: phases.link,
        values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85],
        threshold: 75,
        deviation: () => (100 - getCurrentValue(schedules.stability))/10,
        min: .01,
        max: 99.99
    },
    bandwidth: {
        phase: phases.link,
        values: [10, 20, 30, 40, 50, 55, 60, 65, 70],
        threshold: 65,
        deviation: () => (100 - getCurrentValue(schedules.stability))/5,
        min: .01,
        max: 99.99
    },
    shift: {
        phase: phases.link,
        values: [0],
        deviation: () => getCurrentValue(schedules.shiftDeviation),
        min: -120,
        max: 120
    },
    shiftDeviation: {
        phase: phases.link,
        values: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 80, 80, 50, 70, 40, 20, 10, 5, 4, 3],
        deviation: () => 0,
        min: .01,
        max: 99.99
    },
    stability: {
        phase: phases.link,
        values: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 98],
        threshold: 85,
        deviation: () => 5,
        min: .01,
        max: 99.99
    },
    compression: {
        phase: phases.link,
        values: [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 60, 60, 60, 40, 40, 20, 20, 20, 15],
        deviation: () => (100 - getCurrentValue(schedules.stability))/5,
        min: .01,
        max: 99.99
    }
};

let start = null;
let audioCtx = audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let frequency = null;


function getElapsedTime() {
    if (!start) {
        return 0.0
    }
    return (new Date() - start)/1000.0;
}

function isBefore(phase) {
    return getElapsedTime() < phase.start;
}

function isAfter(phase) {
    return getElapsedTime() >= phase.next.start;
}

function isDuring(phase) {
    return !(isBefore(phase) || isAfter(phase));
}

function getCurrentValue(schedule) {
    let currentTime = getElapsedTime();
    if (isBefore(phases.monitor)) {
        return 0.0;
    }
    if (isBefore(schedule.phase)) {
        return gaussian(0, schedule);
    }
    currentTime -= schedule.phase.start;
    let values = schedule.values;
    if (currentTime > values.length) {
        return gaussian(values[values.length - 1], schedule);
    }
    /*global Smooth*/
    const f = Smooth(values);
    return gaussian(f(currentTime),schedule);
}

function gaussian(mean, schedule) {
    const deviation = schedule.deviation();
    const min = schedule.min;
    const max = schedule.max;
    if (!start) {
        return 0.0;
    }
    if (!deviation) {
        return mean;
    }
    if (isBefore(phases.monitor)) {
        return 0.0;
    }
    let u1 = Math.random();
    let u2 = Math.random();
    let z = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
    if (isBefore(schedule.phase)) {
        return Math.min(Math.max(z/10,min),max);
    }
    return Math.min(Math.max(mean + deviation*z,min),max);
}

class Clock extends Component {
    constructor(props) {
        super(props);
        this.state = {
            date: null
        };
    }
    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        if (!isBefore(phases.monitor)) {
            this.setState({date: new Date()});
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        let currentDate = '-------------------------------';
        let contactDate = '-------------------------------';
        if (this.state.date) {
            currentDate = this.state.date.toISOString();
        }
        if (!isBefore(phases.search)) {
            let futureDate = new Date(this.state.date);
            futureDate.setFullYear(futureDate.getFullYear()+3);
            let deltaSeconds = (futureDate-this.state.date)/1000;
            let t = getElapsedTime() - phases.search.start;
            let deltaSecondsNow = deltaSeconds*(1.0-1.0/Math.pow(1.01,Math.pow(t,3)));
            let currentFutureDate = new Date(this.state.date.getTime() + deltaSecondsNow*1000);
            contactDate = currentFutureDate.toISOString();
        }
        return (
            <Segment textAlign="center" inverted>
                <Statistic size="teensy" inverted horizontal>
                    <Statistic.Label>T<sub>current</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{currentDate}</Statistic.Value>
                </Statistic>
                <Divider fitted hidden/>
                <Statistic size="teensy" inverted horizontal>
                    <Statistic.Label>T<sub>contact</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Statistic.Label>
                    <Statistic.Value>{contactDate}</Statistic.Value>
                </Statistic>
            </Segment>

        )
    }
}

class LocalChat extends Component {
    componentDidMount() {
        navigator.mediaDevices.getUserMedia({audio:true, video:true}).then((stream) => {
            var video = document.getElementById('gum-local');
            video.srcObject = stream;
            this.stream = stream;
        });
    }

    componentWillUnmount() {
        this.stream.getAudioTracks()[0].stop();
        this.stream.getVideoTracks()[0].stop();
    }
    render() {
        return(
            <div className="video-container">
                <video id="gum-local" width="475"></video>
            </div>
        );
    }
}

class Metric extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: 0.0
        };
    }
    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        this.setState({value: getCurrentValue(this.props.schedule)});
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        let value = '-.--';
        if (!isBefore(phases.monitor)) {
            value = this.state.value.toFixed(2);
        }
        let state = 'metric-off';
        if (this.props.schedule.threshold && this.state.value > this.props.schedule.threshold) {
            state = 'metric-on';
        }
        else if (!this.props.schedule.threshold && !isBefore(this.props.schedule.phase)) {
            state = 'metric-on';
        }
        else if (isAfter(this.props.schedule.phase) && this.props.schedule.threshold && this.state.value < this.props.schedule.threshold) {
            state = 'metric-warn';
        }
        else if (isDuring(this.props.schedule.phase)) {
            state = 'metric-starting';
        }
        return (
            <Grid.Row>
                <Grid.Column textAlign="left">
                    {this.props.title}
                </Grid.Column>
                <Grid.Column textAlign="right" className={state}>
                    {value}%
                </Grid.Column>
            </Grid.Row>
        );
    }
}

class RemoteChat extends Component {

    componentDidMount() {
        var myThis = this;
        var video = document.getElementById("gum-remote");
        var id = this.props.id;
        var myNumber = id + (this.props.caller ? '-caller' : '-callee');
        console.log(`my number is ${myNumber}!`);
        /*global PHONE*/
        var phone = PHONE({
            number        : myNumber,
            publish_key   : 'pub-c-9ba2da8a-c8d5-4511-a953-f342e79621ca',
            subscribe_key : 'sub-c-bbbda54a-cb83-11e6-8164-0619f8945a4f',
            media         : { audio : true, video : true },
            ssl: true
        });
        phone.receive(function(session){
            console.log("I'm getting a call!");
            console.log(session);
            console.log(video);
            session.connected(function(session) {
                console.log(session);
                session.video.width = 475;
                session.video.className = "noisey";
                session.video.style.webkitFilter = 'opacity(0%)';
                myThis.video = session.video;
                video.appendChild(session.video);
                console.log(session.pc.getRemoteStreams());
                let sourceNode = audioCtx.createMediaStreamSource(session.pc.getRemoteStreams()[0]);
                let gainNode = audioCtx.createGain();
                let ringModulatorCarrier = audioCtx.createOscillator();
                ringModulatorCarrier.frequency.value = 50;
                let ringModulatorCarrierGain = audioCtx.createGain();
                ringModulatorCarrierGain.gain.value = 5;
                ringModulatorCarrier.connect(ringModulatorCarrierGain);
                ringModulatorCarrierGain.connect(gainNode.gain);
                ringModulatorCarrier.start();
                // gainNode.gain.value = 10;
                sourceNode.connect(gainNode);
                let biquadFilter = audioCtx.createBiquadFilter();
                frequency = biquadFilter.frequency
                biquadFilter.type = "lowpass";
                biquadFilter.frequency.value = 0;
                gainNode.connect(biquadFilter);
                console.log(audioCtx.destination.numberOfInputs);
                audioCtx.destination.disconnect();
                console.log(audioCtx.destination.numberOfInputs);
                biquadFilter.connect(audioCtx.destination);
                console.log(audioCtx.destination.numberOfInputs);
            });
            session.ended(function(session) {
                video.innerHTML='';
            });
        });
        if (this.props.caller) {
            phone.ready(() => {
                let number = id + '-callee';
                console.log(`I'm making a call to ${number}!`);
                phone.dial(number);
            });
        }
        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        if (!this.video) {
            return;
        }
        const opacity = getCurrentValue(schedules.strength);
        const blur = 5 - getCurrentValue(schedules.bandwidth)/17;
        const greyscale = 100 - getCurrentValue(schedules.bandwidth)/2;
        const hueRotate = getCurrentValue(schedules.shift);
        const contrast = 10 * getCurrentValue(schedules.compression);
        this.video.style.WebkitFilter = `opacity(${opacity}%) contrast(${contrast}%) hue-rotate(${hueRotate}deg) grayscale(${greyscale}%) blur(${blur}px)`;
        if (frequency) {
            frequency.value = getCurrentValue(schedules.bandwidth) * 20;
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return(
            <div className="video-container noisey" id="gum-remote"></div>

        );
    }
}

class Radar extends Component {
    componentDidMount() {
        let ctx = document.getElementById('radar');
        this.dataPoints = [0,0,0,0];
        let dataConfig = {
            labels: ["Stbl", "Str", "Bw", "Hdr"],
            datasets: [
                {
                    backgroundColor: "rgba(179,181,198,0.2)",
                    borderColor: "rgba(179,181,198,1)",
                    pointBackgroundColor: "rgba(179,181,198,1)",
                    pointBorderColor: "#fff",
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "rgba(179,181,198,1)",
                    fill: true,
                    data: this.dataPoints
                },
            ]
        };
        /*global Chart*/
        Chart.defaults.global.title.display = false;
        this.graph = new Chart(ctx, {
            type: 'radar',
            data: dataConfig,
            options: {
                legend: {display: false},
                scale: {
                    ticks: {display:false, min:0, max:100},
                    scaleLabel: {display: false}
                }
            }
        });

        this.timerID = setInterval(
            () => this.tick(),
            this.props.updateInterval
        );
    }

    tick() {
        this.dataPoints[0] = getCurrentValue(schedules.stability);
        this.dataPoints[1] = getCurrentValue(schedules.strength);
        this.dataPoints[2] = getCurrentValue(schedules.bandwidth);
        let compression = getCurrentValue(schedules.compression);
        this.dataPoints[3] = compression ? 100 - compression : 0.0;
        console.log(this.dataPoints);
        this.graph.update();
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return(
            <Segment inverted>
                <Label attached='top'><p>Temporal Link</p></Label>
                <Divider hidden section/>
                <canvas id="radar"></canvas>
            </Segment>
        );
    }
}

class Phase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            state: "off"
        };
    }

    componentDidMount() {
        this.timerID = setInterval(
            () => this.tick(),
            101
        );
    }

    tick() {
        if (isAfter(this.props.phase)) {
            this.setState({state: "on"});
            clearInterval(this.timerID);
        }
        else if (!isBefore(this.props.phase)) {
            this.setState({state: "starting"});
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return (
            <Grid.Column width={2} textAlign="center" className={this.state.state}>{this.props.name}&nbsp;{this.state.state === 'off' ? 'OFF' : 'ON'}</Grid.Column>
        )
    }

}

class Present extends Component {
    componentDidMount() {
        start = new Date();
    }

    render() {
        return (
            <Container>
                <Grid celled>
                    <Grid.Column width={3}>
                        <Radar updateInterval={167}/>
                    </Grid.Column>
                    <Grid.Column width={3}>
                    </Grid.Column>
                    <Grid.Column width={5}>
                    </Grid.Column>
                    <Grid.Column width={5}/>
                    <Grid.Column width={2}>
                        <Segment inverted>
                            <Divider inverted horizontal>Acc V<sub>min</sub>/V<sub>max</sub></Divider>
                            <Grid columns="three">
                                <Grid.Column textAlign="left">
                                    V<sub>u</sub>
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="left">
                                    V<sub>c</sub>
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="left">
                                    V<sub>t</sub>
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="left">
                                    V<sub>d</sub>
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="left">
                                    V<sub>s</sub>
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="left">
                                    V<sub>b</sub>
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                                <Grid.Column textAlign="right">
                                    -.--
                                </Grid.Column>
                            </Grid>
                            <Divider inverted horizontal>Q<sub>link</sub></Divider>
                            <Grid columns="two">
                                <Metric schedule={schedules.strength} title="Str" updateInterval={199}/>
                                <Metric schedule={schedules.bandwidth} title="Bw" updateInterval={197}/>
                                <Metric schedule={schedules.shift} title="Shift" updateInterval={193}/>
                                <Metric schedule={schedules.compression} title="Cmp" updateInterval={191}/>
                                <Metric schedule={schedules.stability} title="Stbl" updateInterval={181}/>
                            </Grid>
                        </Segment>
                    </Grid.Column>
                    <Grid.Column width={14} className="tight-sides">
                        <Segment inverted>
                            <LocalChat/>
                            <RemoteChat caller id={this.props.id} updateInterval={101}/>
                        </Segment>
                    </Grid.Column>
                    <Grid.Column width={2}>
                    </Grid.Column>
                    <Grid.Column width={4}>
                        <Clock updateInterval={193}/>
                    </Grid.Column>
                    <Phase name="Monitors" phase={phases.monitor}/>
                    <Phase name="Accelerator" phase={phases.accelerate}/>
                    <Phase name="Entangler" phase={phases.entangle}/>
                    <Phase name="Search" phase={phases.search}/>
                    <Phase name="Link" phase={phases.link}/>
                </Grid>
            </Container>
        );
    }
}

class Future extends Component {
    render() {
        return (
            <Container>
                <LocalChat/>
                <RemoteChat callee id={this.props.id} updateInterval={101}/>
            </Container>
        );
    }
}

class App extends Component {
    render() {
        console.log(window.location.search);
        if (window.location.search.includes('future')){
            return (
                <Future id="his-wife-athol"/>
            );
        }
        else {
            return (
                <Present id="his-wife-athol"/>
            );
        }
    }
}

export default App;
