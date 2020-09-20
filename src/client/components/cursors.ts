export default class Cursors {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys

  none = true
  prevNone = true

  left = false
  right = false
  up = false
  down = false

  constructor(public scene: Phaser.Scene, public socket: SocketIOClient.Socket) {
    this.cursors = scene.input.keyboard.createCursorKeys()

    this.scene.events.on('update', this.update, this)
  }

  cursorsDown() {
    return { left: this.left, right: this.right, up: this.up, down: this.down, none: this.none }
  }

  update() {
    if (!this.cursors.left || !this.cursors.right || !this.cursors.up || !this.cursors.down) return

    this.none = this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown ? false : true

    if (!this.none || this.none !== this.prevNone) {
      this.left = false
      this.right = false
      this.up = false
      this.down = false

      if (this.cursors.left.isDown) {
        this.left = true
      } else if (this.cursors.right.isDown) {
        this.right = true
      }

      if (this.cursors.up.isDown) {
        this.up = true
      } else if (this.cursors.down.isDown){
        this.down = true
      }

      if (!PHYSICS_DEBUG) {
        let total = 0
        if (this.left) total += 1
        if (this.right) total += 2
        if (this.down) total += 3
        if (this.up) total += 6
        if (this.none) total += 9
        this.socket.emit('U' /* short for updateDude */, total)
      }
    }

    this.prevNone = this.none
  }
}
