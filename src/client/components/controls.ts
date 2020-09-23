export default class Controls {
  left = false
  right = false
  up = false
  down = false
  kill = false//this is for attempting to kill
  controls: Control[] = []
  none = true
  prevNone = true

  constructor(public scene: Phaser.Scene, public socket: SocketIOClient.Socket) {
    // add a second pointer
    scene.input.addPointer()

    const detectPointer = (gameObject: Control, down: boolean) => {
      if (gameObject.btn) {
        switch (gameObject.btn) {
          case 'left':
            this.left = down
            break
          case 'right':
            this.right = down
            break
          case 'up':
            this.up = down
            break
          case 'down':
            this.down = down
            break
        }
      }
    }
    scene.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Control) =>
      detectPointer(gameObject, true)
    )
    scene.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, gameObject: Control) =>
      detectPointer(gameObject, false)
    )

    let left = new Control(scene, 0, 0, 'left').setRotation(-0.5 * Math.PI)
    let right = new Control(scene, 0, 0, 'right').setRotation(0.5 * Math.PI)
    let up = new Control(scene, 0, 0, 'up')
    let down = new Control(scene, 0, 0, 'down')
    this.controls.push(left, right, up, down)
    this.resize()

    this.scene.events.on('update', this.update, this)
  }

  controlsDown() {
    return { left: this.left,
             right: this.right,
             up: this.up,
             down: this.down,
             none: this.none }
  }

  resize() {
    const SCALE = 1
    const controlsRadius = (192 / 2) * SCALE
    const w = this.scene.cameras.main.width - 10 - controlsRadius
    const h = this.scene.cameras.main.height - 10 - controlsRadius
    let positions = [
      {
        x: controlsRadius + 10,
        y: h
      },
      { x: controlsRadius + 214, y: h },
      { x: w, y: h }
    ]
    this.controls.forEach((ctl, i) => {
      if(positions.length <= i) return
      ctl.setPosition(positions[i].x, positions[i].y)
      ctl.setScale(SCALE)
    })
  }

  update() {    
    //for movement:
    this.none = this.left || this.right || this.up || this.down ? false : true
    
    if (!this.none || this.none !== this.prevNone) {
      let total = 0
      if (this.left) total += 1
      if (this.right) total += 2
      if (this.down) total += 3
      if (this.up) total += 6
      if (this.none) total += 100
      this.socket.emit('U' /* short for updateDude */, total)
    }

    this.prevNone = this.none
  }
}

class Control extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, public btn: string) {
    super(scene, x, y, 'controls')
    scene.add.existing(this)

    this.setInteractive()
      .setScrollFactor(0)
      .setAlpha(0.5)
      .setDepth(2)

    if (!scene.sys.game.device.input.touch) this.setAlpha(0)
  }
}
