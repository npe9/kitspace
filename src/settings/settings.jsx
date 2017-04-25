const Redux        = require('redux')
const React        = require('react')
const superagent   = require('superagent')
const semantic     = require('semantic-ui-react')
const htmlToReact  = new (new require('html-to-react')).Parser(React).parse
const CustomAvatarEditor = require('./custom_avatar_editor')

const TitleBar = require('../title_bar')

const defaultMessage = 'We also use email for avatar detection if no avatar is uploaded.'

const Settings = React.createClass({
  getInitialState() {
    return {
      emailMessage: '',
      user: {},
      newAvatarBlob: null,
      newAvatarUrl: null,
      modalOpen: false,
      rawImageBlob: '',
      message: null,
    }
  },
  getUser() {
    return superagent.get('/accounts/api/v4/user')
      .set('Accept', 'application/json')
      .withCredentials()
      .then(r => {
        const newUser = r.body
        //force a re-render of the avatar if it's the same
        if (this.state.user.avatar_url === newUser.avatar_url) {
          newUser.avatar_url += '?' + Math.random()
        }
        this.setState({user: newUser})
      })
      .catch(e => this.setState({user: 'not signed in'}))
  },

  getForm() {
    return superagent.get('/accounts/profile')
      .withCredentials()
      .then(r => {
        const doc = (new DOMParser).parseFromString(r.text, 'text/html')
        function copy(selector) {
          document.querySelector(selector).value = doc.querySelector(selector).value
        }
        copy('input[name=authenticity_token]')
        copy('input[name="user[email]"]')
        copy('input[name="user[name]"]')
        const emailMessage = doc.querySelector('input[name="user[email]"]').nextElementSibling.innerHTML
        this.setState({emailMessage})
      }).catch(e => console.error(e))
  },

  componentDidMount() {
    this.getUser()
    this.getForm()
  },

  setRawImage(event) {
    const reader = new FileReader()
    const file   = document.querySelector('input[type=file]').files[0]
    reader.addEventListener('load', () => {
      this.setState({
        rawImage: reader.result,
        modalOpen: true,
      })
    }, false)
    if (file) {
      reader.readAsDataURL(file);
    }
  },

  handleSave() {
    if (this.editor) {
      const image = this.editor.getImageScaledToCanvas()
      this.setState({newAvatarUrl: image.toDataURL()})
      image.toBlob(blob => {
        this.setState({newAvatarBlob: blob})
      })
    }
    this.setState({modalOpen: false})
  },

  setMessage(message) {
    this.setState({message})
    setTimeout(() => {
      this.setState({message: null})
    }, 5000)
  },

  render() {
    const user = this.state.user || {}
    const emailWarning = this.state.emailMessage !== defaultMessage
    const warning = emailWarning && this.state.emailMessage !== ''
    return (
      <div className='Settings'>
        <TitleBar user={this.state.user}>
          <div className='titleText'>
            {'Settings'}
          </div>
        </TitleBar>
        <semantic.Container>
          <form
            className={`ui arge form ${warning ? 'warning' : ''}`}
            encType='multipart/form-data'
            acceptCharset='UTF-8'
            method='post'
            onSubmit={event => {
              event.preventDefault()
              const formData = new FormData(this.form)
              if (this.state.newAvatarBlob != null) {
                formData.append('user[avatar]', this.state.newAvatarBlob, 'avatar.png')
              }
              superagent.post('/accounts/profile')
                .send(formData)
                .set('Accept', 'application/json')
                .then(r => {
                  this.setMessage({text: r.body.message, type: 'success'})
                  this.getUser()
                  this.getForm()
                }).catch(e => {
                  this.setMessage({text: 'Profile update failed.', type: 'failed'})
                })
            }}
            ref={form => this.form = form}
          >
            <input name='utf8' type='hidden' value='✓' />
            <input type='hidden' name='_method' value='put' />
            <input name='authenticity_token' type='hidden' />
            <semantic.Grid>
              <semantic.Grid.Column mobile={14} tablet={10} computer={8}>
                  {'Avatar'}
                  <semantic.Segment compact>
                    <label htmlFor='fileInput'>
                      <semantic.Image
                        as='a'
                        style={{height: 80, width: 80}}
                        src={this.state.newAvatarUrl || this.state.user.avatar_url}
                      />
                    </label>
                    <input
                      style={{
                        opacity: 0,
                        position: 'absolute',
                        zIndex: -1
                      }}
                      id='fileInput'
                      accept='image/*'
                      type='file'
                      onChange={this.setRawImage}
                    />
                    <semantic.Modal
                      open={this.state.modalOpen}
                      size='small'
                    >
                    <semantic.Modal.Content>
                      <CustomAvatarEditor
                        ref={customEditor => this.editor = (customEditor || {}).editor}
                        image={this.state.rawImage}
                      />
                    </semantic.Modal.Content>
                    <semantic.Modal.Actions>
                      <semantic.Button primary onClick={this.handleSave}>{'Ok'}</semantic.Button>
                    </semantic.Modal.Actions>
                  </semantic.Modal>
                </semantic.Segment>
                <label>Name</label>
                <semantic.Form.Input name='user[name]' type='text' />
                <label>Email</label>
                <semantic.Form.Input name='user[email]' type='text'/>
                <semantic.Message size='tiny' warning={emailWarning} id='emailMessage'>
                  {htmlToReact(`<div>${this.state.emailMessage}</div>`)}
                </semantic.Message>
                <semantic.Message
                  style={{visibility: this.state.message ? 'visible' : 'hidden'}}
                  positive={this.state.message && this.state.message.type === 'success'}
                  negative={this.state.message && this.state.message.type !== 'success'}
                >
                  {this.state.message ? this.state.message.text : '-'}
                </semantic.Message>
                <semantic.Button type='submit'>{'Save'}</semantic.Button>
              </semantic.Grid.Column>
            </semantic.Grid>
          </form>
        </semantic.Container>
      </div>
    )
  }
})

module.exports = Settings