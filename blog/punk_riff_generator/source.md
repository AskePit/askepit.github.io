---
tags:
  - article
  - guitar
  - tab
  - js
  - html
  - css
title: Punk riff generator
---
Once upon a time, maybe five years ago, I decided I wanted to play a sound in the browser. I don’t even remember the exact task or what I was trying to achieve—most likely just messing around with different samples, maybe programming a track. So I Googled how to do it, landed on a StackOverflow question/answer somewhat [like this](https://stackoverflow.com/questions/30482887/playing-a-simple-sound-with-web-audio-api). And there it was—my simple “playing a sound” query was met with a barrage of contexts, buffers, decoding… I felt so suffocated that I immediately waved it all off and decided I wasn’t that interested in the first place—certainly not at that cost. And I forgot about the whole thing for many years.

How I got back to this topic, I don’t really remember either. But I suddenly wanted to play a simple sine wave in the browser, and if successful, maybe mess around with it a bit. Perhaps I was (un)healthily influenced by [Hyper Light Drifter](https://store.steampowered.com/app/257850/Hyper_Light_Drifter/) with its [chiptune](https://en.wikipedia.org/wiki/Chiptune) music.

Then the idea started to develop spontaneously, and eventually turned into a mini-project called "Punk riff generator," which we'll discuss in this article. The project is based on a simple concept: generate and play four random chords in the browser that could later be used as the basis for a new punk song. Isn’t that just brilliant?

![](https://habrastorage.org/webt/au/am/m6/auamm6vdqj6zgb4hbqpnom7v5uc.jpeg)

Let’s set the right mood for reading this article:

- The article contains a couple dozen short audio tracks so you can feel the evolution of the sound we’re going to create with our own hands. And the evolution is something to behold!
- The narrative will be accompanied by some slightly suffocating dives into sound theory, but I’ll try to explain things clearly.
- I’ll boldly assume that you won’t need any musical background to understand what’s going on in the article. But that's not a guarantee! How accurate this assumption is will be revealed in the comments.
- The article turned out to be a cleverly intertwined mix of mathematics, music theory, and programming. Read on and develop yourself in all directions. :)

## Simple Sine Wave

So, my first impulse was to generate a sine wave in the browser. No sooner said than done—I went to [Stack Overflow](https://stackoverflow.com/questions/34708980/generate-sine-wave-and-play-it-in-the-browser) as usual, copy-pasted the solution from there, dropped it into the script section of an HTML page, and got the desired signal:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943607&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Perfect, just what I wanted! Now let's take a look at the code behind generating this sound. In browser JS, sound is handled by the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), and it was precisely its buffers and decoding that scared me off during my first attempt to explore browser audio a few years ago. The API is indeed quite low-level, which, by the way, makes it very flexible and full of possibilities. We'll get back to the API later, as it appears frequently in the source code, but for now, let’s ignore it and focus on the key piece of code that creates our sine wave:

```javascript
function sineWaveAt(sampleNumber, tone) {
	const time = sampleNumber / context.sampleRate
	return Math.sin(2 * Math.PI * tone * time)
}
```

Just two lines of code, and the only recognizable part is the sine function. And now, to fully understand it, we need an explanatory team and a dive into the physics of sound and the intricacies of its digitization.

### The Physics (and Math) of Sound

We've all heard that sound is vibrations, or a wave with a certain frequency. This is, of course, a very abstract explanation, leaving many questions unanswered: why a wave specifically? What kind of wave is it? Can we see it, touch it?

_Why_ sound is a wave is primarily a question for our ears. The eardrum catches vibrations transmitted through the air (or water) and knows how to interpret them as a certain sensation—what we call hearing. So it’s more accurate to say that it's not the sound that is a wave; it's the wave reaching the ear that the brain interprets as sound.

How can we visualize such vibrations? The simplest way is to imagine a sine wave graph; or a cosine wave, if you prefer—they’re not much different for our purposes. A sine wave is, in a sense, an example of the purest sound in a vacuum: a note without timbre, color, or impurities. Let's try plotting the canonical sine wave $y=sin(x)$:

![](https://habrastorage.org/webt/tv/hp/ip/tvhpipi6titfjhwkl55kavuy2om.png)

You’re probably familiar with this graph from school, and you remember that it extends infinitely to the left and right along the $x$ axis—here, time is in seconds. The $y$ axis represents the amplitude of the wave. To put it simply, you can think of the $y$ axis as the signal’s volume. Amplitude is a bit tricky since it's not clear what to compare its values to, so for simplicity, let’s assume that if the sound is within the $[-1;1]$ range, it’s a full-bodied, standard-volume sound. I’d appreciate it if someone in the comments could formally characterize the $y$ axis values.

The sine wave graph, while infinite, has a clearly defined repeating pattern—its period. For $y=sin(x)$, the period is $2\pi$ seconds:

![](https://habrastorage.org/webt/se/mc/ol/semcoloue9csux8fjgfnwvyxgug.png)

And here’s the problem with the $y=sin(x)$ wave: if one oscillation of this signal lasts $2\pi \approx 6.28$ seconds, then the frequency of such a signal is $1/2\pi\approx0.16Hz$. Meanwhile, humans can only hear sounds in the frequency range from 20Hz to 20000Hz at best. So, our $y=sin(x)$ signal is some kind of extreme case of [infrasound](https://en.wikipedia.org/wiki/Infrasound), and it’s unlikely that any living creature could hear it.

What can we do to make the wave audible? A sine wave can be stretched along both axes, with the sine formula slightly enhanced with coefficients:

$$
y=a∗sin(hx)
$$

where:

$a$ is the scale on the $y$ axis. The larger $a$ is, the taller and, accordingly, louder the sine wave becomes.  
$h$ is the scale on the $x$ axis. The larger $h$ is, the shorter the period of the sine wave, the more compressed the graph, and the higher the frequency (the pitch gets squeakier).

To make our $h$ coefficient conveniently measurable in Hertz (i.e., oscillations per second), it’s helpful to make it a multiple of $2\pi$:

$$
y=a∗sin(2πhx)
$$

Now we’re getting somewhere. Let’s look at an example with two sine waves:

![](https://habrastorage.org/webt/x5/dl/kd/x5dlkdkpwwrx4iv-sjaafxs4w-c.png)

What can we say about these graphs, armed with the theory we’ve just covered? Can we, out of curiosity, deduce their exact formulas? Let’s start with something simple—amplitude. The green graph has a vertical range of $[-1; 1]$, so the amplitude is one, just like a regular sine wave without obvious coefficients. The blue graph is compressed vertically, with extremum points at -0.75 and 0.75, so its $a=0.75$.

Now, let’s examine the horizontal properties of the graphs. Notice the point $x=0.01$. In the interval $[0; 0.01]$, exactly one period of the blue graph and four periods of the green graph fit. In other words, in 0.01 seconds, the two waves manage to make 1 and 4 oscillations, respectively. A bit of simple math tells us that this equals $1/0.01=100$ and $4/0.01 = 400$ oscillations per second, respectively.

And now we know how these two sine waves look in formulaic terms:

$$
y_{green}=sin(2 \pi 400x)
$$

$$
y_{blue}=0.75sin(2 \pi 100x)
$$

Don’t forget what $2\pi$ does here—it’s the period of oscillation, giving the numbers 100 and 400 the ability to be interpreted as "oscillations per second." Or, more simply, the wave’s frequency in Hertz.

So we end up with the green wave as a 400Hz sound at 100% volume, and the blue wave as a 100Hz sound at 75% volume.

Hertz are great, but could we say what notes these are? And this is where we smoothly transition from the theory of _sound_ to the theory of _music_.

### The Physics (and Math) of Music

It's well-known that there are only seven notes. A more accurate statement, however, would be:

- There are only seven notes,
- But this applies to Western music,
- Actually, there are not exactly seven, but more like twelve,
- And no one will stop you from going beyond these twelve notes, which happens all the time.

So, what are these 12 notes, and why aren't there just seven—after all, there's *do re mi fa sol la ti*? Well, take a look:

![](https://habrastorage.org/webt/fo/hp/d2/fohpd2qj9ugxzhuqqbyn8doojdc.png)

Don’t ask why this is the case or what logic is behind it. Most likely, it just happened historically. It’s worth noting that there are actually an infinite number of notes: after you play these 12 notes on the piano, you can continue and play the same 12 notes again but in a different octave. This works both ways—leftward, toward the lower, bass notes, and rightward, toward the higher ones.

Each note has its own frequency, measured in Hertz, and these values can be found in online tables. Since I needed to quickly code the frequencies of the notes I was planning to work with, I turned to [ChatGPT](https://chatgpt.com/) to handle the tedious part for me:

![](https://habrastorage.org/webt/dr/-o/7p/dr-o7pbqeaid-mn8clt5q5aj0ik.png)

Why these particular values have been established as the named notes upon which all Western music is built—that's more a question of human perception and culture, which traces back to ancient Greece, and we probably won’t delve too deep into that topic. Suffice it to say that the standard frequency is typically taken as the A4 note (A above middle C), which has been assigned a frequency of 440Hz, and the other notes are derived from it based on specific ratios that are pleasing to the ear.

The sine wave we managed to generate in our project, by the way, is an E4 note with a frequency of 329.63Hz.

---

Alright, now that we've dived in and resurfaced from the theory, we can turn back to our two-line code and see if it makes any more sense now:

```javascript
function sineWaveAt(sampleNumber, tone) {
	const time = sampleNumber / context.sampleRate
	return Math.sin(2 * Math.PI * tone * time)
}
```

The last line now more or less makes sense because:

Expectation: $y=a*sin(2\pi h x)$  
Reality: `Math.sin(2 * Math.PI * tone * time)`

Here, `tone` is the frequency in Hertz, and `time` is our $x$, since, let’s not forget, the $x$-axis represents time. But how did we form the `time` variable, and where did `sampleNumber` and `sampleRate` come from? And here, once again, we must briefly dive into theory—the theory of sound digitization.

### Sound Digitization

Here, the theory will be a bit simpler and quicker. A sound wave is an analog signal, meaning it can be divided and scaled infinitely. But to represent such a signal in digital form, it is [sampled](https://en.wikipedia.org/wiki/Sampling_(signal_processing)), i.e., broken down into a finite set of points. For example, our sine wave might look something like this when sampled:

![](https://habrastorage.org/webt/yv/hc/3o/yvhc3owmfwnx_7flznhze4m0tea.png)

You’ve probably seen numbers like 44.1kHz or 48kHz when talking about CD or DVD quality sound. These numbers (yes, frequencies again, but different ones) indicate how many points a one-second signal will be divided into. For instance, a sampling rate of 44.1kHz means splitting one second of signal into 44,100 points. So, point #44100 will represent the sound at 1 second, #66150 at 1.5 seconds, #88200 at 2 seconds, and so on.

---

Now, let’s return to the code!

```javascript
function sineWaveAt(sampleNumber, tone) {
	const time = sampleNumber / context.sampleRate
	return Math.sin(2 * Math.PI * tone * time)
}
```

How did we calculate time? The Web Audio API has its own audio context that supports a specific sample rate stored in the `sampleRate` variable. To calculate the time xxx, we need to know the sample number for which we want to get the value of our sine wave: `sampleNumber`. Finally, dividing the sample number by the sample rate gives us the exact time in seconds.

We’ve finally figured out that two-line code! All for me to tell you that the Web Audio API has a special oscillator node that can generate a sine wave signal of any frequency on its own, and we didn’t have to manually mess with these formulas. But look how much we’ve learned!

## Oscillator

As mentioned, we have a ready-made [oscillator node](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode) at our disposal that generates a periodic sound wave of any given frequency. So, manually forming a sine wave like we did above is mainly for educational purposes.

You can set the frequency in Hz for the `OscillatorNode` object to produce a sound of any pitch. But what’s more interesting, and something we haven’t encountered yet, is that you can specify not just a sine wave but also square, triangle, and sawtooth waveforms. Here’s an illustrative image from [Wikipedia](https://en.wikipedia.org/wiki/Square_wave#/media/File:Waveforms.svg):

![](https://habrastorage.org/webt/ic/hp/mh/ichpmhu3wclyzk3oca9zjqnzyzu.png)

Here’s a short snippet so you can compare them by ear. The sequence will play a sine wave, triangle wave, square wave, and sawtooth wave:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1866971985&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

For those who played 8-bit consoles, you might feel a slight sense of déjà vu—this is roughly how developers on the NES would vary the timbre of game melodies, ranging from very soft, smooth sounds to sharp, ear-piercing ones.

Now let’s create our oscillator node and compare its usage with what we wrote in the `sineWaveAt` function:

```javascript
const oscillator = context.createOscillator();
oscillator.frequency.value = toneInHz
```

In the most minimalist form, that’s all: you create a node, set its pitch—done! However, creating and configuring a node doesn’t immediately produce sound in the browser. To hear the oscillator, its signal needs to be routed somewhere. Here’s where we’ll delve deeper into the Web Audio API, which I didn’t do for the previous example since the `sineWaveAt` code was essentially a dead end.

As I briefly mentioned, the Web Audio API provides us with an `AudioContext`. Essentially, it is a global object with all the necessary methods to create nodes and connect them to each other. Nodes can be:

- **Sound sources**, like our `OscillatorNode`. There’s also a node that can play an mp3 file, for example.
- **Sound processors**. These are nodes for various equalization, echo, volume adjustments, etc.
- **Sound destinations**. In fact, there is only one such node, which acts as a virtual speaker that receives the final sound and it’s what you’ll hear through your speakers or headphones.

The main idea and principle of the Web Audio API are: you create the nodes you need, connect them to each other so that the sound passes through and is processed in the correct order, and finally route the final signal to the destination node, [`AudioContext.destination`](https://developer.mozilla.org/en-US/docs/Web/API/AudioDestinationNode).

In our case, the setup is fairly straightforward: we have an oscillator node, and we connect it to `AudioContext.destination`, and you’ll hear the sound in the browser. However, I’d advise against listening to it right away since there’s a catch. The volume of the oscillator is very high because the signal it produces is in the familiar range of $y \in [-1; 1]$, which means “full volume”.

The volume of the signal needs to be significantly reduced, and the oscillator node itself doesn’t provide any settings for this. The volume is controlled by a separate node, [`GainNode`](https://developer.mozilla.org/en-US/docs/Web/API/GainNode). It has one main setting — [`gain`](https://developer.mozilla.org/en-US/docs/Web/API/GainNode/gain). This controls the volume in the range of $[0; 1]$. I settled on $0.25$.

So, schematically, we should get something like this:

![](https://habrastorage.org/webt/vo/_9/5w/vo_95w5g93uu8ydll1r9jzxixew.png)

Expressed in code:

```javascript
context = new AudioContext();

const oscillator = context.createOscillator()
oscillator.frequency.value = tone

const gain = context.createGain()
gain.gain.value = 0.25

oscillator.connect(gain)
gain.connect(context.destination)

oscillator.start(context.currentTime)
```

We created the context, set up and configured the two nodes, connected everything, and finally started the oscillator with the `start` command. Only after this “kick” will the oscillator start generating sound, which will follow our straightforward setup: the Gain node will receive the sound from the oscillator, attenuate it to a quarter of its original volume, and pass the result to the output.

The result will be exactly the same as before. So, to mix things up, let’s set the oscillator to use a triangular waveform:

```javascript
oscillator.type = "triangle";
```

Now, the result sounds like this:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1866972435&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

## Playing a Melody

Now that we have our signal, let's use it to play a simple melody. I chose the opening part of the song [Seven Nation Army](https://www.youtube.com/watch?v=0J2QdDbelmY) for this purpose. I assume most people can play these notes in their heads, so I won’t include a snippet of the song here.

When it comes to playing a sequence of sounds, we inevitably encounter the concept of a timeline in all its manifestations, along with related questions:

- How long should each sound be played?
- In what unit should the duration of notes be measured?
- How to set the tempo of the song? And if you want to speed up or slow down the overall tempo, how to maintain the correct duration of notes relative to each other?
- How to divide the song into measures, and how does the number of measures depend on the tempo of the song?

There are many questions, so we will address them step by step. Let’s start with how such issues are resolved by real musicians. They use musical notation — a melody is written on a staff, which contains all the necessary information related to the temporal characteristics of the song. Our snippet on the staff might look something like this:

![](https://habrastorage.org/webt/cw/8i/_y/cw8i_yrrynkg0pt8w7mofp0tsxs.png)

See the seven sequentially written notes? As an interesting exercise, try to play Seven Nation Army in your head and follow each note on the staff. Give yourself a thumbs up if you managed. Now, let’s break down what is written here and why.

First, let’s note the interesting notation $4/4$ after the treble clef. It means that you can stomp your feet, clap your hands, and repeatedly shout “one, two, three, four!” to this song. If you catch the groove and do it in the right tempo, it will be a lot of fun.

$♩=110$ at the top indicates the tempo of the song, which tells you how fast to clap and shout. Tempo is measured in bpm or beats per minute. Literally, 110 bpm means: if you continuously play a quarter note (♩), you will play exactly 110 of them in one minute.

But who is this ♩? It’s easier to first show how all types of notes fit into a $4/4$ measure:

![](https://habrastorage.org/webt/ur/xh/pc/urxhpc-mwz0grfttuof98j7m8fq.png)

Different notes fit differently into the “one, two, three, four!” measure. In the first measure, we have a _whole note_ — it lasts for the entire measure, all four beats. In the second measure, we have _half notes_, two of them — one lasts for “one, two”, and the other lasts for “three, four!”. Subsequent measures feature _quarter notes_, _eighth notes_, and _sixteenth notes_. I assume you get the principle.

The ♩ we are interested in is the quarter note. It is interesting because in a $4/4$ measure, it is played exactly 4 times, symbolizing each “one”, “two”, “three”, and “four”. The tempo of 110 bpm is related to the number of such notes in a minute. And no one expects you to manually calculate all these durations and count up to 110. Musicians generally know that a song with a more or less typical, moderate tempo is 110-125 bpm; 90 bpm is something slow; 70 bpm is sluggishly slow; 150 bpm is something fast and lively; and 200 bpm is extreme. And there’s always a metronome that can be set to the desired bpm, ticking out quarter notes so you can play in a steady tempo even without a drummer.

> **Note:** Don’t get confused by flags! The notation ♫ is just two grouped notes ♪♪. Similarly, ♬=𝅘𝅥𝅯𝅘𝅥𝅯. Notes with flags can be grouped into very long sequences.

> **Interesting Fact:** In the Chechen Republic, as of 2024, [music with a tempo below 80 bpm and above 160 bpm was legally banned](https://news.ru/society/v-chechne-bolshe-ne-budet-slishkom-bystroj-i-medlennoj-muzyki/).

You might have noticed that in the musical notation of Seven Nation Army, some notes have suspicious dots next to them. These dots increase the note duration by 1.5 times. So,

♩.=♩♪♩.=♩♪♩.=♩♪

Complicated? Perhaps, but musicians are used to it.

Also, in the near future, we will need pauses. These are like notes, but their absence. The duration of a pause is how long the silence lasts. They also come in _whole_, _half_, _quarter_, _eighth_, _sixteenth_, etc., variations and can be combined with dots that extend the pause by 1.5 times:

![](https://habrastorage.org/webt/nz/et/y0/nzety0ldfr8lf2tf_v_9188fyym.png)

---

We now face the task of programming all these concepts. The theory may seem overwhelming, but if we start with the concept of bpm, it becomes quite straightforward:

```javascript
const BPM = 110
const BPS = BPM / 60

const FOURTH = 1 / BPS
const EIGHT = FOURTH / 2
const HALF = FOURTH * 2
const WHOLE = HALF * 2

const FOURTH_DOT = FOURTH * 1.5
const EIGHTH_DOT = EIGHTH * 1.5
const SIXTEENTH_DOT = SIXTEENTH * 1.5
const HALF_DOT = HALF * 1.5
```

These are the constants we need to start creating. Here’s what we’ve done:

- Set the BPM as required by the song at 110.
- Converted BPM (beats per **minute**) to BPS (beats per **second**) by dividing BPM by 60.
- Knowing that a beat is exactly a quarter note, we convert BPS to SPB (seconds per beat) by simply inverting the value. Now we have the number of seconds a quarter note should last.
- We can easily calculate the durations of other notes in seconds based on the quarter note.
- Notes with dots are simply multiplied by 1.5.

Now, let’s imagine how four repetitions of our Seven Nation Army phrase might look:

```javascript
for (i = 0; i < 4; ++i) {
	playSineWave(E4, FOURTH_DOT)
	playSineWave(E4, EIGHT)
	playSineWave(G4, EIGHTH_DOT)
	playSineWave(E4, EIGHTH_DOT)
	playSineWave(D4, EIGHT)
	playSineWave(C4, HALF)
	playSineWave(B3, HALF)
}
```

Yes, this definitely resembles what happens on a musical staff: we play each note sequentially, specifying its pitch and duration. All that remains is to write our yet-to-be-existent `playSineWave` function.

```javascript
let timeline = 0.0

function playSineWave(tone, seconds) {
    const oscillator = context.createOscillator()

    oscillator.type = "triangle"
    oscillator.frequency.value = tone // value in hertz

    const gain = context.createGain()
    gain.gain.value = 0.25
    oscillator.connect(gain)
    
    gain.connect(context.destination)

    oscillator.start(context.currentTime + timeline)
    oscillator.stop(context.currentTime + timeline + seconds)

    timeline += seconds
}
```

In theory, we have already seen this: sequentially connecting the Oscillator, Gain, and Destination nodes. The main trick here is determining when to start and, importantly, when to stop the oscillator. The `timeline` variable helps with this. Imagine a slider moving across a musical timeline during playback, as in any music player. The `timeline` variable acts as this slider. In the last line of `playSineWave`, this slider is incremented by the duration of the current note. Thus, we start and stop the oscillator at the `timeline` time and stop it after `seconds` seconds.

It's important to understand that `start` and `stop` methods are not synchronous methods with waiting for completion, but asynchronous schedulers. In `start`, you schedule when in the future the oscillator will start; in `stop`, you schedule when the oscillator will stop. Essentially, our external `for` loop, which iterates through the entire song, will execute in milliseconds at the start of the program and plan the future playback of all sounds. Only then will the audio context, in the background, play everything you have programmed. This is why, without the monotonically increasing `timeline`, your code will run in the most horrific way—playing all 28 notes (4 cycles of 7 notes) simultaneously. We definitely don’t want that, as our ears cannot handle it.

And here is the result of our efforts:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943595&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

## Eliminating Clicks

You might have noticed unpleasant clicks when changing each note. When searching for a solution, Google presents an [article](https://alemangui.github.io/ramp-to-value) on one of the first pages that explains the nature of this phenomenon and suggests a simple solution: gradually reduce the volume of the signal to 0 milliseconds before the end of each note. In other words, applying a micro fade-out to each note. Here’s how I implemented it:

```javascript
const startTime = context.currentTime + timeline
const endTime = startTime + seconds

gain.gain.setTargetAtTime(0, endTime - DAMPING_START, DAMPING_DURATION);
oscillator.start(startTime)
oscillator.stop(endTime + DAMPING_DURATION)
```

I chose `DAMPING_START` and `DAMPING_DURATION` experimentally to eliminate clicks while ensuring that the notes don’t "stumble" and create pauses:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943586&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

## Power Chord

The next goal is to get a bit closer to rock music. Instead of playing melodies one note at a time, we will play them as [power chords](https://en.wikipedia.org/wiki/Power_chord). What are these? They are three notes played simultaneously. Most rock riffs are played using these chords 90% of the time. To put it simply, power chords create that sweet "chug-chug" sound.

On the musical staff, this twist might look a bit intimidating:

![](https://habrastorage.org/webt/4y/og/4d/4yog4dhdpj3ubht7dqjnx38y_a4.png)

But there's no need to worry—the musical staff isn’t quite suited for these things, but in [guitar tablature](https://ru.wikipedia.org/wiki/%D0%A2%D0%B0%D0%B1%D1%83%D0%BB%D0%B0%D1%82%D1%83%D1%80%D0%B0), it looks simpler:

![](https://habrastorage.org/webt/ui/fq/h0/uifqh0cmpukns3rdyfknabvb4ai.png)

We won't delve into how to read these numbers. Just know that on a guitar, power chords have a [consistent shape](https://www.google.com/search?q=power+chord+hand+position&sca_esv=f30a9b7fa8506153&sca_upv=1&udm=2&biw=1920&bih=945&sxsrf=ADLYWILQKROGqHn1yF9mwX7bu5CLYLenbQ%3A1720433937466&ei=Eb2LZt79G8qB9u8P39eJiAk&ved=0ahUKEwieys7tm5eHAxXKgP0HHd9rApEQ4dUDCBA&uact=5&oq=power+chord+hand+position&gs_lp=Egxnd3Mtd2l6LXNlcnAiGXBvd2VyIGNob3JkIGhhbmQgcG9zaXRpb24yBRAAGIAESN4TUN4EWP8OcAF4AJABAJgBWqAB5QWqAQE5uAEDyAEA-AEBmAIKoAL0BcICBhAAGAgYHpgDAIgGAZIHAjEwoAeBCA&sclient=gws-wiz-serp) regardless of where you play it on the fretboard (with some exceptions, but still), so this finger positioning allows you to slide along the fretboard and create infernal rock sounds.

Our current implementation of the `playSineWave` function allows playing only one sound at a time, so it’s time to enhance this function. Let's start again with the outer loop and how we would like to see it:

```javascript
for(let i = 0; i < 4; ++i) {
	playSound([E3, B3, E4], FOURTH_DOT)
	playSound([E3, B3, E4], EIGHTH)
	playSound([G3, D4, G4], EIGHTH_DOT)
	playSound([E3, B3, E4], EIGHTH_DOT)
	playSound([D3, A3, D4], EIGHTH)
	playSound([C3, G3, C4], HALF)
	playSound([B2, Fsh3, B3], HALF)
}
```

First of all, we’ll rename the `playSineWave` function to something more fitting: `playSound`. The main improvement is that instead of playing a single sound, the function will now accept an array of notes. Essentially, the function will remain the same, except that instead of creating just one oscillator, it will create N oscillators—one for each note in the provided array:

```javascript
function playSound(notes, seconds) {
    const gain = context.createGain()
    gain.gain.value = VOLUME
    gain.connect(context.destination)

    for (let i = 0; i < notes.length; i++) {
        const oscillator = context.createOscillator()

        oscillator.type = "triangle"
        oscillator.frequency.value = notes[i]
        oscillator.connect(gain)

        const startTime = context.currentTime + timeline
        const endTime = startTime + seconds

        gain.gain.setTargetAtTime(0, endTime - DAMPING_START, DAMPING_DURATION)
        oscillator.start(startTime)
        oscillator.stop(endTime + DAMPING_DURATION)
    }

    timeline += seconds
}
```

The `GainNode` remains a single one because there’s no need for a separate gain node for each oscillator. You might reasonably wonder why we’re creating a new gain node every time in `playSound`—after all, it would be sufficient to have just one gain node for the entire program. And this is a valid point. We'll address it:

```javascript
const gain = context.createGain();

...

function playSound(notes, seconds) {
    const startTime = context.currentTime + timeline
    const endTime = startTime + seconds

    for (let i = 0; i < notes.length; i++) {
        const oscillator = context.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = notes[i]
        oscillator.connect(compressor)
        
        oscillator.start(startTime)
        oscillator.stop(endTime + DAMPING_DURATION)
    }

    gain.gain.setTargetAtTime(0, endTime - DAMPING_START, DAMPING_DURATION);
    gain.gain.setTargetAtTime(VOLUME, endTime + DAMPING_DURATION, DAMPING_DURATION);

    timeline += seconds
}
```

We also moved `startTime` and `endTime` out of the loop. However, our fade-out workaround breaks with the introduction of a single gain node—now we need to restore the volume after applying the fade-out effect. Previously, this worked because when we reduced the gain node's volume to zero, the node was no longer needed, and we simply (and wastefully) created a new one each time.

With this seemingly simple improvement, our Seven Nation Army now sounds a bit different:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943580&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

This could serve as an introduction to an unknown game on your favorite 8-bit console. It doesn’t sound like a guitar at all and lacks the power. We need to try processing the oscillator's sound to make it heavier and more distinctive. If it starts to resemble a guitar simulation from [Guitar Pro 5](https://ru.wikipedia.org/wiki/Guitar_Pro), I will be satisfied.

## Distortion

The key factor that makes a guitar sound heavy is the [distortion](https://en.wikipedia.org/wiki/Distortion_(music)) effect and its variants. Distortion is what gives the "crunch" sound. Guitarists typically use special pedals to apply this effect to their guitar sound.

> — But you said that power chords are the "crunch"? — Power chords _play_ the "crunch," but distortion is what _creates_ the "crunch." As heard in the previous audio track, power chords alone couldn't turn our melody into hardcore because it lacked the distortion effect.

Since we don’t have a magical analog guitar pedal to give us distortion, we’ll need to implement it programmatically. Unfortunately, the Web Audio API doesn’t provide a built-in distortion node, so we’ll have to come up with a solution ourselves.

What is distortion by its nature? The name suggests it's a type of signal "distortion," which makes a clean, smooth sound become loud, overloaded, gritty, and roaring. But what algorithm or function can turn a sine wave into something that growls and buzzes?

Distortion is commonly implemented using a transforming mathematical function that is (beware, mathematical jargon!):

- Smooth
- Monotonic
- Increasing
- Non-linear

Why these characteristics? They are well explained, for instance, in [this article](https://alexanderleon.medium.com/web-audio-series-part-2-designing-distortion-using-javascript-and-the-web-audio-api-446301565541). This article also suggests that a [sigmoid function](https://ru.wikipedia.org/wiki/%D0%A1%D0%B8%D0%B3%D0%BC%D0%BE%D0%B8%D0%B4%D0%B0) fits these characteristics well. This family of mathematical functions is described by various formulas, but they all share a graph that resembles the letter $S$.

Choose the sigmoid function that suits you best:

$$
y = \frac{kx}{1+|kx|}
$$

$$
y = \frac{2}{\pi}arctan(\frac{\pi}{2}kx)
$$

$$
y = tanh(kx)
$$

$$
y = \frac{2}{1+e^{-kx}}-1
$$

$$
y = \frac{(3 + k)*arctan(5sinh(0.25x))}{\pi + k|x|}
$$

$$
y=1.3arctan(tanh(\frac{kx}{2}))
$$

No matter which complexity of formula you choose, their graphs will look quite similar, with only nuances in shape and behavior when changing the variable $k$:

![](https://habrastorage.org/webt/uv/l7/im/uvl7imvr242ogh-mimwicbbbsx4.gif)

How can we apply these transforming functions to our signal? We would like to get a formula whose graph we can display and observe how the signal changes with the distortion effect applied.

To simplify, let's assume we are dealing with a canonical sine wave $y = \sin(x)$. In this case, we need to somehow apply a sigmoid transformation to the sine wave. This sounds complicated. The algebra from Wikipedia suggests that the resulting distorted signal can be obtained through the [composition of two functions](https://ru.wikipedia.org/wiki/%D0%9A%D0%BE%D0%BC%D0%BF%D0%BE%D0%B7%D0%B8%D1%86%D0%B8%D1%8F_%D1%84%D1%83%D0%BD%D0%BA%D1%86%D0%B8%D0%B9): in our case, sigmoid and sine, which mathematically is written as $(f \circ \sin)(x)$ if we consider the sigmoid as $f$. Here, Wikipedia reassures us that the notation with a circle is equivalent to $f(\sin(x))$. This is clear: where previously in the sigmoid formula there was $x$, now there should be our signal formula, i.e., $\sin(x)$. By making simple substitutions, we get the desired distortion of the sinusoidal signal:

![](https://habrastorage.org/webt/3g/oh/bd/3gohbdr405awmgt4ukhigibfyha.gif)

Thus, we see distortion in action—it's a sine wave tending towards a [periodic square wave](https://en.wikipedia.org/wiki/Pulse_wave).

---

The Web Audio API provides a [`WaveShaperNode`](https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode) that allows you to apply a transformation function to any signal. We will use this to distort the sound produced by the oscillators.

The node can be given any graph in discrete form: as a `Float32Array`. Here’s how it works:

- The graph is always considered as a function with $x$ in the range $[-1; 1]$.
- The `Float32Array` can be of any length. The longer the array, the higher the sampling frequency of your transformation graph. The node will interpret the first element of the array as $x=-1$, the middle element as $x=0$, and the last element as $x=1$.
- The numbers in the array are the $y$ values.
- The node will apply this transformation graph to any signal it receives, just as we manually applied the sigmoid to the sine wave on the graph.

We need to insert another node into the chain:

![](https://habrastorage.org/webt/jn/b2/oo/jnb2oovyk-ei6cqevist6fouglo.png)

I settled on a sigmoid of the form

$$
y = \frac{(3 + k)*arctan(5sinh(0.25x))}{\pi + k|x|}
$$

and created a function that returns the transformation in the format required by the `WaveShaperNode`:

```javascript
function makeDistortionCurve(k = 20) {
    const n_samples = 256
    const curve = new Float32Array(n_samples);

    for (let i = 0; i < n_samples; ++i ) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k)*Math.atan(Math.sinh(x*0.25)*5) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}
```

The signal is sampled at 256 points. This number was determined experimentally after everything was up and running — this small number of points proved to be sufficient for applying distortion quite accurately. The line `const x = i * 2 / n_samples - 1;` is the conversion from the range [0; 256] to the range `[-1; 1]`, which is the range where our transformation function operates. The parameter `k` is the coefficient that adjusted the steepness of the sigmoid curves in the graphs. The higher the `k`, the more aggressive the sound. It’s analogous to the gain knob on a distortion guitar pedal.

Let me provide the rest of the application code in its entirety so you don't get lost in all these code snippets and can keep the overall picture in mind:

```javascript
let context;
let distortion;
let gain;

function makeDistortionCurve(k = 20) {
	...
}

async function init() {
    context = new AudioContext();

    gain = context.createGain();
    gain.gain.value = VOLUME

    distortion = context.createWaveShaper();
    distortion.curve = makeDistortionCurve(50);

    distortion.connect(gain)
    gain.connect(context.destination)
}

let timeline = 0.0

const VOLUME = 0.25

function playSound(notes, seconds) {
    const startTime = context.currentTime + timeline
    const endTime = startTime + seconds

    for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(notes[noteIndex], context.currentTime);
        oscillator.connect(distortion);
        
        oscillator.start(startTime)
        oscillator.stop(endTime + DAMPING_DURATION)
    }

    timeline += seconds
}

const button = document.querySelector("button");

button.onclick = async () => {
    if (!context) {
        await init();
    }

	const BPM = 110
	const BPS = BPM / 60
	
	const FOURTH = 1 / BPS
	const EIGHT = FOURTH / 2
	const HALF = FOURTH * 2
	const WHOLE = HALF * 2
	
	const FOURTH_DOT = FOURTH * 1.5
	const EIGHTH_DOT = EIGHTH * 1.5
	const SIXTEENTH_DOT = SIXTEENTH * 1.5
	const HALF_DOT = HALF * 1.5

	for(let i = 0; i < 4; ++i) {
		playSound([E3, B3, E4], FOURTH_DOT)
		playSound([E3, B3, E4], EIGHTH)
		playSound([G3, D4, G4], EIGHTH_DOT)
		playSound([E3, B3, E4], EIGHTH_DOT)
		playSound([D3, A3, D4], EIGHTH)
		playSound([C3, G3, C4], HALF)
		playSound([B2, Fsh3, B3], HALF)
	}
    timeline = 0
};
```

Let’s go through the main points:

- There is a button somewhere on the web page.
- When clicked, we initialize everything needed to start:
    - Create the context
    - Create and configure gain and distortion nodes. This is where we apply `makeDistortionCurve` to set the sigmoid for the distortion node.
    - Set up the chain distortion -> gain -> context.destination
- We start our loop with 4 repetitions of the melody
- The melody is still played by the `playSound` function, which looks the same as before with a few exceptions:
    - The oscillator output is now fed to the distortion node, not the gain node as before.
    - The trick with the gain level on the gain node is gone, as it turns out that with the distortions we’re applying now, clicks are no longer audible. What was a workaround is now unnecessary — it has disappeared by itself.

Let’s run our program in anticipation of some heavy overdrive!:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1866972396&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Well, it’s not great, but it’s something. It’s definitely distortion, but it sounds very plasticky and has significant frequency issues. Why is that? The simplest answer is that we created an artificial synthesized sound, and its frequency characteristics, or [frequency response](https://en.wikipedia.org/wiki/Frequency_response), are quite different from those of a guitar string sound processed through a distortion effect. The sound of a string and the sound of our pure sine wave are different. Hence, the result after distortion is also different, and unfortunately, worse.

## Equalization

What can we do about this? The first thing that comes to mind is adjusting the frequencies to make the sound closer to what we would like to hear.

> — But the original sine wave had only one frequency, how did multiple frequencies appear? — Firstly, a power chord itself consists of three notes, so at any given moment, we have at least three different frequencies. Moreover, distortion inherently enriches the sound with additional [harmonics](https://en.wikipedia.org/wiki/Harmonic_(music)), so we end up with a whole spectrum of various frequencies.

You’ve probably seen "bouncing waves" in every other music player that pulse and change shape during playback. These are actually all the frequencies of the song being cut and they change over time:

![](https://habrastorage.org/webt/xf/vu/o8/xfvuo8inhr_szihc8b2f3fdldue.png)

The Web Audio API has mechanisms to "bend" this white curve shown in the image above. This is the purpose of the [`BiquadFilterNode`](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode). To understand how it works, let’s imagine that this white curve for a particular sound becomes a horizontal line:

![](https://habrastorage.org/webt/6u/o_/ko/6uo_kooevxwe0xgwny74fyhk_u0.png)

Now we can easily see what the `BiquadFilterNode` can do with this frequency curve:

![](https://habrastorage.org/webt/k1/vw/mw/k1vwmwgx908ewcxvg6dstebw_yg.png)

> Source: [https://subscription.packtpub.com/book/business-and-other/9781782168799/1/ch01lvl1sec12/building-an-equalizer-using-biquadfilternode-advanced](https://subscription.packtpub.com/book/business-and-other/9781782168799/1/ch01lvl1sec12/building-an-equalizer-using-biquadfilternode-advanced)

So, we have a range of possible frequency transformations:

- Lowpass: Smoothly cuts off all highs starting from a specified frequency and to the right.
- Highpass: Smoothly cuts off all lows starting from a specified frequency and to the left.
- Bandpass: Smoothly cuts off all lows and highs starting from a specified frequency and to the left and right, leaving a small untouched area around the specified frequency. The size of this area is controlled by a separate parameter.
- Notch: Opposite of Bandpass — smoothly cuts out a range, leaving everything else untouched.
- Lowshelf: Amplifies or reduces all frequencies to the left of a specified frequency. The amplification or reduction effect is controlled by a separate parameter, which can be negative for reducing the level of frequencies.
- Highshelf: Amplifies or reduces all frequencies to the right of a specified frequency. The amplification or reduction effect is controlled by a separate parameter, which can be negative for reducing the level of frequencies.
- Peaking: Amplifies or reduces frequencies around a specified frequency. The size of the area and the level of amplification or attenuation are controlled by two additional parameters.
- Allpass: I didn’t quite understand what this filter does. Commentators, help! It passes all frequencies but changes their phase relationships. What that means exactly, I have no idea :)

With such a versatile node at our disposal, we can try to shape what we have into something more palatable.

I experimented with frequencies as best as I could. But I should immediately note that we are entering very shaky territory where achieving a good result is a sort of art that professionals in recording, mixing, and mastering dedicate their lives to. Also, I’m an absolute amateur in this area, so I applied filters in a rather chaotic rather than methodical way to frequencies that seemed problematic. Therefore, any sound engineer can assert their superiority in the comments at my expense, and I don’t mind.

So, what did I do? Almost randomly, I arrived at these filters, which seemed to somewhat improve the sound:

- Cut Nosal: Completely removed so-called "nasal frequencies" around 1000 Hz with a notch filter. The sound became less resonant and murky.
- Cut Highs: Used a lowpass filter to cut all frequencies starting from 8500 Hz so the sound wouldn’t be so thin and crackly. Logically, removing frequencies starting from 8500 Hz might seem excessive, but it sounded better to me.
- Cut Lows: Cut the bass with a highpass filter starting from 120 Hz to avoid excessive boominess.
- Peak Mids: Boosted midrange frequencies around 3150 Hz with a peaking filter. Midrange frequencies are the natural guitar range, so I figured they needed to be emphasized.

In the code, this equalization is represented as follows:

```javascript
async function init() {
	...
	
	// cut around 1000 Hz
	let cutNosal = context.createBiquadFilter();
	cutNosal.type = "notch";
	cutNosal.frequency.setValueAtTime(1000, context.currentTime);
	cutNosal.Q.setValueAtTime(4, context.currentTime);
	
	// cut above 8500 Hz
	let cutHighs = context.createBiquadFilter();
	cutHighs.type = "lowpass";
	cutHighs.frequency.setValueAtTime(8500, context.currentTime);
	cutHighs.Q.setValueAtTime(0, context.currentTime);
	
	// cut below 120 Hz
	let cutLows = context.createBiquadFilter();
	cutLows.type = "highpass";
	cutLows.frequency.setValueAtTime(120, context.currentTime);
	cutLows.Q.setValueAtTime(0, context.currentTime);
	
	// boost around 3000 Hz
	let peakMids = context.createBiquadFilter();
	peakMids.type = "peaking";
	peakMids.frequency.setValueAtTime(3150, context.currentTime);
	peakMids.Q.setValueAtTime(1.5, context.currentTime);
	peakMids.gain.setValueAtTime(5, context.currentTime);
	
	distortion.connect(cutNosal)
	cutNosal.connect(cutHighs)
	cutHighs.connect(cutLows)
	cutLows.connect(peakMids)
	peakMids.connect(gain)
	gain.connect(context.destination)
}
```

And here’s how it sounded:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1866972339&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Not exactly a noticeable improvement, right? The sound is still quite unpleasant. It also feels flat and lacks depth. So, I thought it would be a good idea to add some reverb to the sound.

## Reverb

Reverb is essentially an echo effect. The more reverb you apply to a sound, the more spacious the environment in which the sound is heard will seem.

The Web Audio API provides us with a [`ConvolverNode`](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode), which allows us to create _any_ kind of reverb. However, the API achieves such ultimate versatility in a clever and somewhat lazy way — the node has only one main parameter, [buffer](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode/buffer), into which you need to feed an impulse response.

What is an impulse response? It is an audio file that records the "atmosphere" of a room, space, or any other environment in a special way. By "atmosphere," we mean the room’s or space’s response to signals of all frequencies. You can think of it as if you recorded a guitar in a large room with a microphone and then subtracted the sound of the guitar from that recording. What remains is the room’s response to the sounds. Essentially, an impulse response provides us with this kind of response.

You can find a wide variety of impulse response files online to emulate any space — from a small closet or bathroom to a subway station, cathedral, or large stadium. Applying one of these impulse responses to your audio track will give you the echo characteristic of the chosen environment.

I had never used impulse responses before, but it turned out to be quite straightforward: I downloaded a small library of wav files from the internet, fed them into the `ConvolverNode`, and observed the results. After some attempts, I got an acceptable outcome.

Here’s a function that provides a ready-to-use, configured node:

```javascript
async function createReverb() {
    let convolver = context.createConvolver();
  
    // load impulse response from file
    let response = await fetch("./WireGrind_s_0.8s_06w_100Hz_02m.wav");
    let arraybuffer = await response.arrayBuffer();
    convolver.buffer = await context.decodeAudioData(arraybuffer);
  
    return convolver;
}
```

And then, following the familiar pattern, this node is integrated into the chain within our `init`:

```javascript
async function init() {
	...

    let reverb = await createReverb();

	...
    
    distortion.connect(cutNosal)
    cutNosal.connect(cutHighs)
    cutHighs.connect(cutLows)
    cutLows.connect(peakMids)
    peakMids.connect(reverb)
    reverb.connect(gain)
    gain.connect(context.destination)
}
```

The chain of effects has indeed grown:

![](https://habrastorage.org/webt/yw/rk/jy/ywrkjydivpm2-fvegaln-9ura2m.png)

Enjoy the result:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943577&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

I didn’t exactly enjoy the sound I got. But at least we managed to distract the listener from the frequency imperfections by making the sound less dry and somewhat embedded in space. It might even be a bit too embedded, as I chose a rather strong reverb. By that point, I was quite exhausted from trying to tweak a decent sound, so I decided to pause and switch to the main task of this project—finally creating the riff generator itself.

## Generating Chords

So, we’ve reached the core functionality. To recap, the purpose of the application is to generate four random power chords and play them four times in a row. It sounds simple enough, and since we already know how to play chords, we are almost there.

The first problem, or rather, uncertainty, arises almost immediately—how exactly will we play the generated sequence of chords? We could, for example, simply strum each chord once. But that would be boring and unexciting, wouldn’t it? Okay, since we have a _punk_ riff generator, maybe it’s enough to methodically and monotonously strum down 8 times like caricatured bassists from jokes? This is a more acceptable option, but it’s still very dull.

In the end, I concluded that the functionality of the application should be slightly expanded to allow selecting from a set of pre-made rhythms. Here are six rhythms that came to mind and were approved by me as suitable:

```javascript
RYTHMS = [
    [EIGHTH, EIGHTH, EIGHTH, EIGHTH],
    [EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH],
    [FOURTH, EIGHTH, FOURTH, EIGHTH, EIGHTH, EIGHTH],
    [FOURTH_DOT, FOURTH, EIGHTH, EIGHTH, EIGHTH],
    [EIGHTH, EIGHTH, EIGHTH_PAUSE, EIGHTH],
    [EIGHTH, EIGHTH, EIGHTH_PAUSE, EIGHTH, EIGHTH, EIGHTH, EIGHTH_PAUSE, EIGHTH],
]
```

Here are six rhythmic patterns described. It is assumed that we will choose one of the options, and each generated chord will be played according to this rhythmic pattern.

But wait, among the familiar constants, there’s a previously non-existent `EIGHTH_PAUSE`! And it seems clear that this represents a pause lasting one-eighth of a beat, but what constant did we use to express it? Recall that the durations `HALF`, `FOURTH`, `EIGHTH`, etc., are represented by numbers indicating their duration in seconds. Pauses should also last in seconds. But how then do we distinguish between sounds and pauses if both are represented in seconds and no additional information is available, and we don’t want to introduce extra flags, fields, or classes? I solved this problem quite quickly, while also inadvertently introducing _anti-time_:

```javascript
const FOURTH_PAUSE = -FOURTH
const EIGHTH_PAUSE = -EIGHTH
const SIXTEENTH_PAUSE = -SIXTEENTH
const HALF_PAUSE = -HALF
const WHOLE_PAUSE = -WHOLE

const FOURTH_DOT_PAUSE = -FOURTH_DOT
const EIGHTH_DOT_PAUSE = -EIGHTH_DOT
const SIXTEENTH_DOT_PAUSE = -SIXTEENTH_DOT
const HALF_DOT_PAUSE = -HALF_DOT
```

Yes, yes, we will distinguish between sound durations and pause durations using signs. A bit of a hack, but after all, we’re writing in JS, so why not.

For better clarity, here are the same rhythms but in tablature form. Perhaps some will find it easier to perceive the rhythm this way:

![](https://habrastorage.org/webt/w5/lx/sr/w5lxsrbbultu3mhe6tjjxojzqk4.png)

Let’s go over how this should work algorithmically: we generate 4 random power chords, then play each chord according to the chosen rhythmic pattern. And we repeat this 4 times so the listener gets a better grasp of the sequence. So, we are looking at 3 nested loops:
```py
for bar in bars:
	for chors in chords:
		for note in rythm.notes:
			...
```

That was pseudocode. Now let’s write the code for these loops:

```javascript
RYTHMS = [
    [EIGHTH, EIGHTH, EIGHTH, EIGHTH],
    [EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH, EIGHTH],
    [FOURTH, EIGHTH, FOURTH, EIGHTH, EIGHTH, EIGHTH],
    [FOURTH_DOT, FOURTH, SIXTEENTH, EIGHTH_DOT, EIGHTH],
    [EIGHTH, EIGHTH, EIGHTH_PAUSE, EIGHTH],
    [EIGHTH, EIGHTH, EIGHTH_PAUSE, EIGHTH, EIGHTH, EIGHTH, EIGHTH_PAUSE, EIGHTH],
]

button.onclick = async () => {
    if (!context) {
        await init();
    }
    
    const chords = [
        createPowerChord(generateNote()),
        createPowerChord(generateNote()),
        createPowerChord(generateNote()),
        createPowerChord(generateNote())
    ];

    const rythm = RYTHMS[4]

    for(let bar = 0; bar < 4; ++bar) {
        for(let ch = 0; ch < chords.length; ++ch) {
            for(let i = 0; i < rythm.length; ++i) {
                const duration = rythm[i];
                if (duration >= 0) {
                    playSound(chords[ch], rythm[i])
                } else {
                    playPause(duration)
                }
            }
        }
    }
    timeline = 0
};
```

What new methods do we need to implement based on what we've written? We see unfamiliar methods: `playPause()`, `generateNote()`, and `createPowerChord`.

According to our brilliant plan, every time we encounter a negative note duration, we call the function `playPause()` to play (or rather, schedule) silence. This is actually quite simple: we just need to increase the `timeline`.

```javascript
function playPause(duration) {
    timeline += duration
}
```

Now let's move on to `createPowerChord(generateNote())`. The idea is that we first select a random note from our list of notes, and then the `createPowerChord(...)` function, using this note as the first, constructs the correct power chord. It seems simple enough—just do it. However, this task turned out to be the problematic spot that required a slight rewrite of our approach to representing notes in the code.

Here’s how notes were stored up to this point:

```javascript
// Notes in Hz
const C2 = 65.41;
const Csh2 = 69.30;
const D2 = 73.42;
const Dsh2 = 77.78;
const E2 = 82.41;
const F2 = 87.31;
const Fsh2 = 92.50;
const G2 = 98.00;
const Gsh2 = 103.83;
const A2 = 110.00;
const Ash2 = 116.54;
const B2 = 123.47;

const C3 = 130.81;
const Csh3 = 138.59;
const D3 = 146.83;
const Dsh3 = 155.56;
const E3 = 164.81;
const F3 = 174.61;
const Fsh3 = 185.00;
const G3 = 196.00;
const Gsh3 = 207.65;
const A3 = 220.00;
const Ash3 = 233.08;
const B3 = 246.94;

...
```

And next on the list—it's a long one. Now the question is: how do we pick a random note from this set of constants? Well, we can't. At least not while the notes are represented solely in this way. We need a general list containing all these notes. Only then can we select a random element from the list.

It's unpleasant, I know. The solution I ended up with for storing notes also turned out to be somewhat inelegant—I'd even call it a workaround. But we're writing in JS, after all, so why be shy! Here's the result:

```javascript
// Notes in Hz
const NOTES_HZ = [
    65.41,
    69.30,
    73.42,
    77.78,
    82.41,
    87.31,
    92.50,
    98.00,
    103.83,
    110.00,
    116.54,
    123.47,
    ...
]

const C2   = NOTES_HZ[0];
const Csh2 = NOTES_HZ[1];
const D2   = NOTES_HZ[2];
const Dsh2 = NOTES_HZ[3];
const E2   = NOTES_HZ[4]; // E string
const F2   = NOTES_HZ[5];
const Fsh2 = NOTES_HZ[6];
const G2   = NOTES_HZ[7];
const Gsh2 = NOTES_HZ[8];
const A2   = NOTES_HZ[9]; // A string
const Ash2 = NOTES_HZ[10];
const B2   = NOTES_HZ[11];
...
```

And in this way, 59 notes are recorded. Well, that's not great. I think if I spent some time thinking about it, I could have found a better solution, at least by avoiding hardcoded indices. But this project is definitely not about code architecture beauty, so I left it as it is. The important thing is that the goal was achieved—now it's possible to pick a random note from the entire set.

```javascript
function generateNote() {
    const LOWEST_E_STRING = 4
    const HIGHEST_A_STRING = 16
    
    return Math.floor(Math.random() * HIGHEST_D_STRING) + LOWEST_E_STRING;
}

function createPowerChord(tonica) {
    return [NOTES_HZ[tonica], NOTES_HZ[tonica + 7], NOTES_HZ[tonica + 12]];
}
```

In `generateNote`, I specifically limited the random note selection to be from either the 6th guitar string or from the 5th string up to the 6th fret. If you don't understand what that means, don't worry—it's more of a specificity to ensure the power chords are reasonable in pitch and pleasing to the ear. Meanwhile, `createPowerChord` forms the chord based on the correct musical intervals from the given note.

And here's the result of such generation:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943574&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Well, we've achieved what we set out to do! Random chords are generated, and there’s even a rhythmic pattern. It sounds great. Or rather, it sounds a bit off; but it’s great that we achieved the main goal and the browser is making music for us.

But I still couldn't shake the question of how to get better sound quality.
## Real Guitar

As usual, I went searching for answers on the internet and soon found myself back on StackOverflow, where a similar question [was answered](https://stackoverflow.com/questions/24615677/how-to-use-web-audio-api-to-make-sound-like-guitar-piano-etc), suggesting two paths:

- Dive into very complex mathematics and get lost there
- Use a recording of a pure guitar string and apply all effects to it

It’s a case of “two chairs—take your pick.” The first option was intimidating from the start, while the second promised yet another rewrite of constants with frequencies—what exactly needed to be rewritten, I didn't fully understand at the time but anticipated a lot of changes.

In the end, I chose the second option, spurred on by a [post](https://zpl.fi/pitch-shifting-in-web-audio-api/) that explained how to get the entire set of notes from a single harpsichord sample and the math behind it.

And the math is actually quite simple. You might remember that speeding up a melody by two times not only makes it faster but also higher-pitched. Reflecting on the sine wave, you can understand why—compressing the sine wave results in a higher frequency sound. Music theory even tells us that doubling the speed will raise the pitch by one octave. From this, we can derive a straightforward formula for calculating the playback rate of a sample to achieve any desired note:

$$
playbackRate=2^{(note-sampleNote)/12}
$$

where:

- **`note`** is the note we want to play,
- **`sampleNote`** is the note that is played in the instrument sample,
- **`12`** represents the number of notes in an octave, which are evenly spaced apart. Hence, we divide by 12.

And the key thing to remember is that **`note`** and **`sampleNote`** are _not measured in Hertz_; they are just sequential note numbers that follow one another and are evenly spaced.

So where do Hertz come into play? Actually, they are no longer needed explicitly, just like oscillators—we will be using the sound of the guitar from an audio file and treating it as the reference note.

What audio file do we need? I decided that to cover the entire guitar range with a single file of one string’s sound, I would use the sound of the open fourth string.

![](https://habrastorage.org/webt/47/20/4m/47204mng0gf-p6fw2istdhcj_pk.png)

Why the fourth string? It is the thin bass string, covered with winding. Three out of four strings used for power chords are covered with winding, so we maintain the desired timbre—thin unwound strings sound a bit different. The fourth string is roughly in the middle of the sound range, so I figured that its sound could be adjusted up and down without expecting significant discrepancies from the actual string sound.

I found the following sound available online that suited me:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943571&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

An ordinary raw electric guitar. Note the strange resonance at the very end. I don’t know what that is, probably it’s extraneous sounds recorded after the note was played. I’ll pay more attention to it later.

Since this is the sound of the open fourth string, we know that it’s note D3. We will need to build the other notes relative to it. Also, remember that now Hertz are not important; only the relative order of the notes matters.

So does this mean we need to rewrite our note constants again? It turns out we do. The good news is that their representation will now be extremely simple:

```javascript
const C2   = 0
const Csh2 = 1
const D2   = 2
const Dsh2 = 3
const E2   = 4 // E string
const F2   = 5
const Fsh2 = 6
const G2   = 7
const Gsh2 = 8
const A2   = 9 // A string
const Ash2 = 10
const B2   = 11

const C3   = 12
const Csh3 = 13
const D3   = 14 // D string
const Dsh3 = 15
const E3   = 16
const F3   = 17
const Fsh3 = 18
const G3   = 19 // G string
const Gsh3 = 20
const A3   = 21
const Ash3 = 22
const B3   = 23 // B string

...
```

Yes, it’s that simple. And our hack with the array is gone—we can handle it without it now.

We load the audio file exactly the same way we loaded the impulse response for the reverb effect:

```javascript
async function createGuitarSample() {
    return fetch("./guitar_d_string.wav")
        .then(response => response.arrayBuffer())
        .then(buffer => context.decodeAudioData(buffer))
}
```

The `AudioBufferSourceNode` will replace the oscillator node for us. We’ll feed it the loaded audio buffer and set the appropriate `playbackRate` using the formula we discussed earlier:

```javascript
let guitarSample

async function init() {
	...
	guitarSample = await createGuitarSample()
	...
}

...

const SAMPLE_NOTE = D3;

function createSampleSource(noteToPlay) {
    const source = context.createBufferSource()
    source.buffer = guitarSample
    source.playbackRate.value = 2 ** ((noteToPlay - SAMPLE_NOTE) / 12)
    return source
}
```

It is very important that the audio file with the sample is correctly trimmed and has appropriate normalized volume. For example, the initially downloaded file looked like this:

![](https://habrastorage.org/webt/u-/0x/tf/u-0xtfe2wznavske0wzcppspew0.png)

Do you see the silence at the beginning? It needs to be removed, otherwise each note in your final sound will have a delay and discontinuity. I edited the file in [Audacity](https://www.audacityteam.org/) so that it looked like this:

![](https://habrastorage.org/webt/de/fb/ep/defbep8e1vcuw8xgir6eferso1k.png)

And now, finally, by replacing the oscillator with the audio track as the source of the initial sound, we can enjoy the sound of the guitar string processed with all our effects: distortion, reverb, and equalizers:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943559&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Yes, now it sounds like a guitar. Now for the most anticipated part — let's play a power chord:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943553&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Now we're talking! This sound is actually usable. Notice how the strange tail at the end of the file started playing three times at different times? This is a great illustration of what `playbackRate` does to the sound — it slows it down or speeds it up over time, and as a side effect (which, in our case, is not just a side effect but a very important one), it affects the pitch. Later, I cut off the tail from the audio track, but it was amusing.

Now let’s try to adapt the equalizer to the new sound and get the same punk riff generator, but with the updated sound. I admit, I spent a lot of time tweaking the sound and can't say I achieved perfect results. Moreover, I repeatedly equalized the sound over and over, so subsequent audio examples might differ slightly in sound. But overall, the principal layout of all Web Audio API nodes in the project now looks like this:

![](https://habrastorage.org/webt/fc/e7/wz/fce7wzjwtwfhyt8tm2q_-kxzuts.png)

And the generator now sounds like this:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1865332653&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

So, did we reach Guitar Pro 5 level? I think we’re pretty close.

Of course, since this is a random generator, it can produce unattractive riffs, and on some rhythms, a robotic hand can be felt:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1865332830&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Later, we’ll try to divert the listener's attention from the robotic guitar. But before we do that, I want to show something even more robotic. I already mentioned that extreme tempos in music start around 200 bpm and higher. I once accidentally set the tempo to 1000 bpm and got interesting results:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943529&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Curious, right? And how about 10000 bpm?:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1846943526&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

I believe this is a new word in sound generation.

## Convenience

Now let’s take a moment to discuss small but very important conveniences that will make the project a bit more pleasant for both the programmer and the user.

### Stopping playback on replay

After an oscillator node or an audio track is started, it subsequently stops either after playing to the end or if you explicitly call `node.stop(0)`.

Until now, I hadn’t addressed this issue, but every time I pressed the play button on the web page, new sounds would join the old ones still playing, merging into a harsh cacophony. The only way to fix this was to reload the page.

To avoid this, _every_ source node needs to be remembered in a special array, and at the right moment, you need to call `stop(0)` on all nodes:

```javascript
let soundNodes = []

...

function playSound(notes, duration) {
    const startTime = context.currentTime + timeline
    const endTime = startTime + seconds

    for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
        const sample = createSampleSource(notes[noteIndex])
        
        sample.connect(distortion)
        sample.start(startTime)
        sample.stop(endTime + DAMPING_DURATION)

        soundNodes.push(sample)
    }

    timeline += seconds
}

...

button.onclick = async () => {
    for (let i = 0; i < soundNodes.length; ++i) {
        soundNodes[i].stop(0)
    }
    soundNodes = []
    
	...
}
```

Yes, unfortunately, Web Audio API doesn’t provide other mechanisms for resetting the sound.

### Simple Effect Chaining

Until now, we’ve been connecting nodes by calling `node1.connect(node2)` as many times as needed for the required connections:

```javascript
distortion.connect(cutHighs)
cutHighs.connect(gumDown)
gumDown.connect(cutSand)
cutSand.connect(cutSand2)
cutSand2.connect(boostLow)
boostLow.connect(peakMids)
peakMids.connect(reverb)
reverb.connect(gain)
gain.connect(context.destination)
```

If you want to exclude a node from the sequence or change the order of nodes, you have to cleverly adjust the arguments in the `connect` calls, which is very inconvenient. For example, to exclude the reverb from the chain, you need to do the following:

```diff
-peakMids.connect(reverb)
+peakMids.connect(gain)
```

It's very easy to get confused.

But if we simply put all the nodes into a list and then automatically connect them using a `for` loop, we get a very convenient format for manipulating nodes within the list:

```javascript
async function init() {
    ...

    effectsChain = [
        distortion,
        cutHighs,
        gumDown,
        cutSand,
        cutSand2,
        boostLow,
        peakMids,
        reverb,
        gain,
        context.destination
    ]

    for (let i = 0; i < effectsChain.length - 1; ++i) {
        effectsChain[i].connect(effectsChain[i + 1])
    }
}
```

Excluding reverb from the chain now looks like this:

```javascript
effectsChain = [
	distortion,
	cutHighs,
	gumDown,
	cutSand,
	cutSand2,
	boostLow,
	peakMids,
	//reverb,
	gain,
	context.destination
]
```
## Drums

The generator sounds pretty good already, but it lacks liveliness — the sound feels static. This wasn't part of my original scope, but I reasonably concluded that adding drums would bring the sound to a new level, potentially masking some flaws in our guitar sound. Therefore, it's worth adding them, even in a basic form.

I downloaded samples of a kick drum and a snare drum and integrated them into a simple rhythmic pattern. There’s nothing technically new here, so I'll skip the implementation details. I'll just show the resulting set of nodes:

![](https://habrastorage.org/webt/it/rn/au/itrnau9aekjwwh1uwbofub6iy28.png)

As you can see, the scheme has grown quite a bit, and I was very glad that I had written a simplified mechanism for building chains in time — it came in very handy now:

```javascript
effectsChain = [
	distortion,
	cutHighs,
	gumDown,
	cutSand,
	cutSand2,
	boostLow,
	peakMids,
	guitarReverb,
	guitarGain,
	context.destination
]

drumsEffectsChain = [
	drumsReverb,
	drumsGain,
	context.destination
]

for (let i = 0; i < effectsChain.length - 1; ++i) {
	effectsChain[i].connect(effectsChain[i + 1])
}

for (let i = 0; i < drumsEffectsChain.length - 1; ++i) {
	drumsEffectsChain[i].connect(drumsEffectsChain[i + 1])
}
```
Let's note that the volumes of the guitar and drums are individual, so you can finely adjust their levels relative to each other. The echo effect, on the other hand, is shared to avoid a clash of two different "environments."

Here’s the result:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1881241887&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Congratulations, we have rock!

## Giving the Guitar More Presence

After introducing the drums, I noticed that the guitar was lacking a bit of power, and attempts to increase the guitar volume or reduce the drum volume didn’t yield the desired result.

Then I remembered a trick used in many rock albums — the overdub guitar. The idea is simple — you have the same guitar riff played simultaneously in both the left and right ears. Ideally, this should not be just a layering of the same recording panned to the left and right channels, but two different recordings of the same riff, so that the listener perceives slight differences and imperfections in the musician’s playing. This slight mismatch between the two parts creates an impression of depth and stereo sound.

Panning is created quite simply — for this, the Web Audio API has a [`StereoPannerNode`](https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode):

```javascript
let panningLeft = context.createStereoPanner()
panningLeft.pan.setValueAtTime(-0.8, context.currentTime)
```

Here, we shifted the sound 80% to the left with just two lines of code.

A more interesting task is to make the left and right guitars sound slightly different rhythmically. To achieve this, we need to introduce some variation in sound playback to simulate the human factor—people cannot play like machines and adhere to a 100% perfect rhythm. Therefore, we’ll introduce a very small random delay in the playback of each chord for each guitar:

```javascript
const GUITAR_PLAYING_ERRORS = 0.07
const randomFloat = (min, max) => Math.random() * (max - min) + min;

...

function playSound(notes, duration) {
	...

	for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
        const sample = createGuitarSource(notes[noteIndex])

        sample.connect(guitarEffectsChain2[0])
        sample.start(startTime + randomFloat(0, GUITAR_PLAYING_ERRORS))
        sample.stop(endTime + randomFloat(0, GUITAR_PLAYING_ERRORS))

        soundNodes.push(sample)
    }
    
    ...
}
```

So, the start and end of the sound are slightly blurred due to the random delay. Our virtual guitarist occasionally lags behind or speeds up slightly. Not too much, just within a margin that's barely noticeable. Even if `GUITAR_PLAYING_ERRORS` is set to an extremely small value, the spatial effect between the left and right sides will remain.

I also EQ’d the right guitar a bit differently from the left, and applied different distortion formulas to each guitar. As a result, the sound became richer and more varied— the difference from the previous example is quite noticeable:

<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1881248736&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>

Now I’m very satisfied with the sound! It could possibly be improved further, but I’d prefer to stop here since the result is already excellent.

Here’s how the principal effects scheme now looks:

![](https://habrastorage.org/webt/uv/cr/bp/uvcrbpjngwbg4scpg_uxmx2iay8.png)

As you can see, I had to omit showing the nodes within the equalizers, as the diagram would have been excessively cumbersome. All nodes can be seen in the chains described in the code.

```javascript
guitarEffectsChain = [
	distortion,
	cutHighs,
	gumDown,
	cutSand,
	cutSand2,
	boostLow,
	peakMids,
	panningLeft,
	guitarGain,
]

guitarEffectsChain2 = [
	distortion2,
	cutHighs2,
	cutSand2_2,
	cutSand22,
	boostLow2,
	peakMids2,
	panningRight,
	guitarGain,
]

guitarEffectsFinalChain = [
	guitarGain,
	reverb,
]

drumsEffectsChain = [
	drumsGain,
	reverb,
]

finalChain = [
	reverb,
	context.destination
]

for (const chain of [
	guitarEffectsChain,
	guitarEffectsChain2,
	guitarEffectsFinalChain,
	drumsEffectsChain,
	finalChain
]) {
	for (let i = 0; i < chain.length - 1; ++i) {
		chain[i].connect(chain[i + 1])
	}
}
```
## Application Layout

So, I've achieved the functionality I initially planned. We've even exceeded expectations by adding nice features like drums and overdub guitars, which I'm very pleased with.

However, I still had the task of creating a representative web page where users could interact with the Punk riff generator in a user-friendly manner. I initially tried to design the page myself. But to give you an idea of how bad I am at design, my version of the page looked like this:

![](https://habrastorage.org/webt/jq/ql/ed/jqqledyiq7fqm0kk292oji8r-zw.png)

So, I turned to a professional—my wife—and she created a stunning design that's easy on the eyes. Thanks to her:

![](https://habrastorage.org/webt/pm/kt/-d/pmkt-dncpm24bb4mgy02jicvj0a.png)

The layout was successfully implemented by me, and now you can see the result of all our hard work on the [demo page](https://askepit.github.io/tools/punk_riff_generator/).

Thus, our little adventure into browser-based music comes to an end. Thanks to everyone who made it to the end. Perhaps someday I'll add more features to this generator. For now, its main purpose is to click the play button until you find a riff you like. After that, you can save it somewhere and use it in your musical endeavors. I'd be happy to read any suggestions in the comments about features that could be added to this simple generator. Any suggestions that seem good and interesting to me will be recorded in the "Deep Todo backlog" and, perhaps, someday implemented when I find the time. Of course, you can always fork the [GitHub project](https://github.com/AskePit/punk-riff-generator) or post issues there!

---
<small>© Nikolai Shalakin. Translated by the author.</small>