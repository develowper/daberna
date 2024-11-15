import type {HttpContext} from '@adonisjs/core/http'
import {loginValidator, registerValidator} from "#validators/auth";
import User from "#models/user";

export default class AuthController {

  async register({request, response, auth}: HttpContext) {

    const data = await request.validateUsing(registerValidator)
    const user = await User.create(data);

    await auth.use('web').login(user);

    return response.redirect().toRoute('user.panel')

  }

  async login({request, auth, response}: HttpContext) {

    const {email, password} = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)

    const isAdmin = request.matchesRoute('admin.login');
    if (isAdmin)
      await auth.use('admin_web').login(user)
    else await auth.use('web').login(user)

    return response.redirect().toRoute(`${isAdmin ? 'admin' : 'user'}.panel`)

  }

  async logout({request, auth, response}: HttpContext) {

    let guard;
    if (request.url().indexOf('admin/') >= 0)
      guard = auth.use('admin_web')
    else
      guard = auth.use('web')

    guard.logout()

    return response.json({message: 'Success'})
  }

  async me({auth}: HttpContext) {

    await auth.check()
    return {user: auth.user}
  }

}
