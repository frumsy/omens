export default class Player {
  id: string
  dead = false
  color: number = 0xffffff
  x: number
  y: number
  role: string
  constructor(id: number) {//, options: { socketId: string; clientId: number; x: number; y: number; role: string}
    this.id = id.toString()
  }
}
