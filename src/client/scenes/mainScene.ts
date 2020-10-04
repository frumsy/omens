import Texts from '../components/texts'
import Cursors from '../components/cursors'
import { setDudeAnimation, setMummyAnimation } from '../components/animations'
import fullscreenButton from '../components/fullscreenButton'
import Controls from '../components/controls'
import { world } from '../config'
import Resize from '../components/resize'

import SyncManager from '../../server/managers/syncManager'
import { SKINS } from '../../constants'
import { NONE, Tilemaps } from 'phaser'
import Dude from '../../server/game/arcadeObjects/dude'
import Player from '../components/player'

interface Objects {
  [key: string]: any
}

interface players {
  [pid: string]: Player
}

export default class MainScene extends Phaser.Scene {
  objects: Objects = {}
  sync: { initialState: boolean; objects: any[] } = {
    initialState: false,
    objects: []
  }

  latency: Latency = {
    current: NaN,
    high: NaN,
    low: NaN,
    ping: NaN,
    id: '',
    canSend: true,
    history: []
  }

  //for drawing names
  names: Objects = {

  }

  players: Objects = {

  }

  //my players stuff:
  killCooldown = 1
  killTimer = Date.now()
  nickname: string
  role: string

  socket: Socket
  room: string

  map: Tilemaps.Tilemap
  botLayer: Tilemaps.StaticTilemapLayer
  topLayer: Tilemaps.StaticTilemapLayer

  cursors: Cursors | undefined
  controls: Controls | undefined
  level: number = 0

  constructor() {
    super({ key: 'MainScene' })
  }

  init(props: { scene: string; level: number; socket: Socket; room: string, nickname: string}) {
    const { scene, level = 0, socket, room, nickname} = props
    this.level = level
    this.socket = socket
    this.room = room
    this.nickname = nickname
    this.socket.emit('joinRoom', { scene, level, room, nickname })
    
  }

  create() {
    const socket = this.socket

    let levelText = this.add
      .text(0, 0, `Level ${this.level + 1}`, {
        color: '#ffffff',
        fontSize: 42
      })
      .setOrigin(0.5, 0)
      .setDepth(100)
      .setScrollFactor(0)
    // //map stuff:
    this.map = this.add.tilemap('level1');
    let tileset = this.map.addTilesetImage('road_4','road_4');

    this.topLayer = this.map.createStaticLayer('topLayer',[tileset], 0,0).setDepth(1);;
    // this.botLayer = this.map.createStaticLayer('botLayer',[tileset], 0,0).setDepth(0);

      //map collisions
    this.topLayer.setCollisionByProperty({collides: true})
      //
    let starfield = this.add.tileSprite(world.x, world.y, world.width, world.height, 'starfield').setOrigin(0)
    this.cursors = new Cursors(this, socket)
    this.controls = new Controls(this, socket)
    let texts = new Texts(this)
    let fullscreenBtn = fullscreenButton(this)

    this.cameras.main.setBounds(world.x, world.y, world.width, world.height)

    socket.on('getPong', (id: string) => {
      if (this.latency.id !== id) return
      this.latency.canSend = true
      this.latency.current = new Date().getTime() - this.latency.ping
      if (this.latency.history.length >= 200) this.latency.history.shift()
      this.latency.history.push(this.latency.current)
      texts.setLatency(this.latency)
    })
    this.time.addEvent({
      delay: 250, // max 4 times per second
      loop: true,
      callback: () => {
        if (!this.latency.canSend) return
        if (texts.hidden) return
        this.latency.ping = new Date().getTime()
        this.latency.id = Phaser.Math.RND.uuid()
        this.latency.canSend = false
        socket.emit('sendPing', this.latency.id)
      }
    })

    socket.on('killConfirm', (data: {attacker: number, victim: number})=>{
      console.log("kill confiremed")
      console.log("attacker:", data.attacker)
      console.log("victim:", data.victim)
    })

    socket.on('playerJoin', (player: {pid: number})=>{
      this.players[player.pid.toString()] = new Player(player.pid)
      console.log('new player:', player.pid)
      console.log('my id:', this.socket.clientId)
    })

    socket.on('changingRoom', (data: { scene: string; level: number }) => {
      console.log('You are changing room')
      // destroy all objects and get new onces
      Object.keys(this.objects).forEach((key: string) => {
        this.objects[key].sprite.destroy()
        delete this.objects[key]
      })
      socket.emit('getInitialState')
      this.level = data.level | 0
      levelText.setText(`Level ${this.level + 1}`)
    })

    socket.on('S' /* short for syncGame */, (res: any) => {
      if (res.connectCounter) texts.setConnectCounter(res.connectCounter)
      if (res.time) texts.setTime(res.time)
      if (res.roomId) texts.setRoomId(res.roomId)

      // res.O (objects) contains only the objects that need to be updated
      if (res.O /* short for objects */) {
        res.O = SyncManager.decode(res.O)

        this.sync.objects = [...this.sync.objects, ...res.O]
        this.sync.objects.forEach((obj: any) => {
          // the if the player's dude is in the objects list the camera follows it sprite
          if (this.objects[obj.id] && obj.skin === SKINS.DUDE && obj.clientId && +obj.clientId === +socket.clientId) {
            this.cameras.main.setScroll(obj.x - this.cameras.main.width / 2, obj.y - this.cameras.main.height / 2)
          }

          // if the object does not exist, create a new one
          if (!this.objects[obj.id]) {
            let sprite = this.add
              .sprite(obj.x, obj.y, obj.skin.toString())
              .setOrigin(0.5)
              .setRotation(obj.angle || 0)

            // add the sprite by id to the objects object
            this.objects[obj.id] = {
              sprite: sprite
            }
          }

          // set some properties to the sprite
          let sprite = this.objects[obj.id].sprite
          // set scale
          if (obj.scale) {
            sprite.setScale(obj.scale)
          }
          // set scale
          if (obj.tint) {
            sprite.setTint(obj.tint)
          }
          // set visibility
          sprite.setVisible(!obj.dead)
        })
      }
    })
    // request the initial state
    socket.emit('getInitialState')

    // request the initial state every 15 seconds
    // to make sure all objects are up to date
    // in case we missed one (network issues)
    // should be sent from the server side not the client
    // this.time.addEvent({
    //   delay: 15000,
    //   loop: true,
    //   callback: () => {
    //     socket.emit('getInitialState')
    //   }
    // })

    // request the initial state if the game gets focus
    // e.g. if the users comes from another tab or window
    this.game.events.on('focus', () => socket.emit('getInitialState'))
    this.game.events.on('attemptKill', this.attemptKill, this)

    // this helps debugging
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // console.log(pointer.worldX, pointer.worldY)
      console.log(this.players)
    })

    const resize = () => {
      starfield.setScale(Math.max(this.cameras.main.height / starfield.height, 1))
      texts.resize()
      if (this.controls) this.controls.resize()
      fullscreenBtn.setPosition(this.cameras.main.width - 16, 16)
      this.cameras.main.setScroll(this.cameras.main.worldView.x, world.height)
      levelText.setPosition(this.cameras.main.width / 2, 20)
    }

    this.scale.on('resize', (gameSize: any, baseSize: any, displaySize: any, resolution: any) => {
      this.cameras.resize(gameSize.width, gameSize.height)
      resize()
    })
    Resize(this.game)
  }

  update(time: number, delta: number) {
    // update all objects
    if (this.sync.objects.length > 0) {
      this.sync.objects.forEach(obj => {
        if (this.objects[obj.id]) {
          let sprite = this.objects[obj.id].sprite
          if (obj.dead !== null) sprite.setVisible(!obj.dead)
          if (obj.x !== null) sprite.x = obj.x
          if (obj.y !== null) sprite.y = obj.y
          if (obj.angle !== null && typeof obj.angle !== 'undefined') sprite.angle = obj.angle
          if (obj.skin !== null) {
            if (obj.skin === SKINS.MUMMY) {
              if (obj.didrawNamerection !== null) setMummyAnimation(sprite, obj.direction)
            }
            if (obj.skin === SKINS.DUDE) {
              this.drawName(obj)
              //this.players[obj.id] = obj
              if (obj.animation !== null) setDudeAnimation(sprite, obj.animation)
            }
          }
        }
      })
    }
    this.sync.objects = []
  }
  getClosePlayers(player: Dude){
       // @ts-ignore
       let possible: Dude[] = Object.values(this.players).filter((dude: Dude) => {
        //TODO: change this to get a threshold of only players in some distance
        //let dist =Phaser.Math.Distance.Between(player.x, player.y, dude.x, dude.y)
        return true //dist < 50
       })
       // @ts-ignore
       let dudes: Dude[] = possible.sort((a, b) => {
        console.log("1",a)
        console.log("2",b)
        console.log("3",player)
        let d1 = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y)
        let d2 = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y)
        return d1-d2;
        });
        return dudes
  }

  attemptKill(data: any){
    console.log("id:", this.players)
    if(Math.round( (Date.now() - this.killTimer)/1000 ) > this.killCooldown){
      let me = this.players[this.socket.clientId]
      let victims = this.getClosePlayers(me)
      if(victims.length > 0){
        this.killTimer = Date.now()
        console.log("kill")  
        this.socket.emit('attemptKill', {attacker: this.socket.clientId, victim: victims[0].clientId})
      }
    }
  }
  drawName(obj: any){
    if(this.names[obj.id] === undefined){
      let nameStyle = { font: "20px Arial", fill: "#ff0044", align: "center"}
      let text = this.add.text(obj.x, obj.y, this.nickname, nameStyle);
      this.names[obj.id] = text
    }
    else{
      this.names[obj.id].x = obj.x
      this.names[obj.id].y = obj.y
    }
  }
  
}
