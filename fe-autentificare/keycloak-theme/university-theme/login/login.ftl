<#import "template.ftl" as layout>
<@layout.registrationLayout bodyClass="page-login" displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("loginAccountTitle")}
    <#elseif section = "form">
        <#if realm.password>
            <form id="kc-form-login" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                <#if !usernameHidden??>
                    <div class="${properties.kcFormGroupClass!}">
                        <div class="${properties.kcLabelWrapperClass!}">
                            <label for="username" class="${properties.kcLabelClass!}"><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></label>
                        </div>
                        <div class="${properties.kcInputWrapperClass!}">
                            <div class="field-control field-control--with-icon">
                                <span class="field-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none"><path d="M4 7.75A2.75 2.75 0 0 1 6.75 5h10.5A2.75 2.75 0 0 1 20 7.75v8.5A2.75 2.75 0 0 1 17.25 19H6.75A2.75 2.75 0 0 1 4 16.25v-8.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v.3l6.03 4.37a.75.75 0 0 0 .88 0l6.03-4.37v-.3c0-.69-.56-1.25-1.25-1.25H6.75Zm11.75 3.4-5.15 3.73a2.25 2.25 0 0 1-2.64 0L5.5 9.9v6.35c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V9.9Z" fill="currentColor"/></svg>
                                </span>
                                <input tabindex="2" id="username" class="${properties.kcInputClass!}" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="${(enableWebAuthnConditionalUI?has_content)?then('username webauthn', 'username')}" aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" dir="ltr" />
                            </div>
                            <#if messagesPerField.existsError('username','password')>
                                <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                    ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                </span>
                            </#if>
                        </div>
                    </div>
                </#if>

                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcLabelWrapperClass!}">
                        <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
                    </div>
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="password-field" dir="ltr">
                            <span class="field-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none"><path d="M8.25 10V7.75a3.75 3.75 0 1 1 7.5 0V10h.5A2.75 2.75 0 0 1 19 12.75v5.5A2.75 2.75 0 0 1 16.25 21h-8.5A2.75 2.75 0 0 1 5 18.25v-5.5A2.75 2.75 0 0 1 7.75 10h.5Zm1.5 0h4.5V7.75a2.25 2.25 0 1 0-4.5 0V10Zm-2 1.5c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25h-8.5Z" fill="currentColor"/></svg>
                            </span>
                            <input tabindex="3" id="password" class="${properties.kcInputClass!}" name="password" type="password" autocomplete="current-password" aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                            <button class="password-toggle" type="button" aria-controls="password" aria-label="${msg('showPassword')}" data-password-toggle data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                <span data-password-icon="show">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.04 12a10.94 10.94 0 0 1 19.92 0 10.94 10.94 0 0 1-19.92 0Zm10-4.5A4.5 4.5 0 1 0 16.54 12a4.5 4.5 0 0 0-4.5-4.5Zm0 2A2.5 2.5 0 1 1 9.54 12a2.5 2.5 0 0 1 2.5-2.5Z" fill="currentColor"/></svg>
                                </span>
                                <span class="hidden" data-password-icon="hide">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.27 2 18.73 18.73-1.41 1.41-3.34-3.34A10.83 10.83 0 0 1 12 20.5 10.94 10.94 0 0 1 2.04 12a10.9 10.9 0 0 1 4.18-4.95L1.86 3.41 3.27 2Zm5.88 7.29A3.92 3.92 0 0 0 8.54 12 4.5 4.5 0 0 0 13 16.46c.97 0 1.87-.31 2.6-.84l-1.68-1.68A2.48 2.48 0 0 1 10.06 11l-.91-.91Zm10.68 5.27-3.07-3.07c.45-.87.79-1.71 1.2-2.49A10.84 10.84 0 0 0 12 3.5c-1.53 0-2.98.3-4.32.85l1.68 1.68A8.78 8.78 0 0 1 12 5.5 8.87 8.87 0 0 1 19.83 12c-.36.9-.75 1.76-1.19 2.56ZM12 7.5c2.49 0 4.5 2.01 4.5 4.5 0 .62-.13 1.2-.36 1.73l-1.6-1.6c-.19-1.53-1.41-2.75-2.94-2.94L10 7.86c.53-.23 1.11-.36 1.73-.36Z" fill="currentColor"/></svg>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
                    <div id="kc-form-options" class="${properties.kcFormOptionsClass!}">
                        <#if realm.rememberMe && !usernameHidden??>
                            <label class="checkbox-row" for="rememberMe">
                                <#if login.rememberMe??>
                                    <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox" class="checkbox-input" checked />
                                <#else>
                                    <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox" class="checkbox-input" />
                                </#if>
                                <span>${msg("rememberMe")}</span>
                            </label>
                        </#if>
                        <div class="${properties.kcFormOptionsWrapperClass!}">
                            <#if realm.resetPasswordAllowed>
                                <a tabindex="6" href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
                            </#if>
                        </div>
                    </div>
                </div>

                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                    <input tabindex="7" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" name="login" id="kc-login" type="submit" value="${msg('doLogIn')}"/>
                </div>
            </form>
        </#if>
    <#elseif section = "info">
        <span>${msg("noAccount")} <a tabindex="8" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
    <#elseif section = "socialProviders">
        <#if realm.password && social?? && social.providers?has_content>
            <div id="kc-social-providers" class="${properties.kcFormSocialAccountSectionClass!}">
                <div class="separator"><span>${msg("identity-provider-login-label")}</span></div>
                <ul class="${properties.kcFormSocialAccountListClass!} <#if social.providers?size gt 3>${properties.kcFormSocialAccountListGridClass!}</#if>">
                    <#list social.providers as p>
                        <li class="${properties.kcFormSocialAccountGridItem!}">
                            <a data-once-link data-disabled-class="${properties.kcFormSocialAccountListButtonDisabledClass!}" id="social-${p.alias}" class="${properties.kcFormSocialAccountListButtonClass!}" type="button" href="${p.loginUrl}">
                                <#if p.iconClasses?has_content>
                                    <i class="${properties.kcCommonLogoIdP!} ${p.iconClasses!}" aria-hidden="true"></i>
                                </#if>
                                <span class="${properties.kcFormSocialAccountNameClass!}">${p.displayName!}</span>
                            </a>
                        </li>
                    </#list>
                </ul>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
