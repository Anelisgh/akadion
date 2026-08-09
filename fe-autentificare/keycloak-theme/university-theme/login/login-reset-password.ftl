<#import "template.ftl" as layout>
<@layout.registrationLayout bodyClass="page-login page-forgot-password" displayInfo=false displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "header">
        ${msg("emailForgotTitle")}
    <#elseif section = "form">
        <form id="kc-reset-password-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
            <p class="forgot-password-intro">
                <#if realm.duplicateEmailsAllowed>
                    ${msg("emailInstructionUsername")}
                <#else>
                    ${msg("emailInstruction")}
                </#if>
            </p>

            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="username" class="${properties.kcLabelClass!}"><#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if></label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <div class="field-control field-control--with-icon">
                        <span class="field-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M4 7.75A2.75 2.75 0 0 1 6.75 5h10.5A2.75 2.75 0 0 1 20 7.75v8.5A2.75 2.75 0 0 1 17.25 19H6.75A2.75 2.75 0 0 1 4 16.25v-8.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v.3l6.03 4.37a.75.75 0 0 0 .88 0l6.03-4.37v-.3c0-.69-.56-1.25-1.25-1.25H6.75Zm11.75 3.4-5.15 3.73a2.25 2.25 0 0 1-2.64 0L5.5 9.9v6.35c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V9.9Z" fill="currentColor"/></svg>
                        </span>
                        <input type="text" id="username" name="username" class="${properties.kcInputClass!}" autofocus value="${(auth.attemptedUsername!'')}" aria-invalid="<#if messagesPerField.existsError('username')>true</#if>" dir="ltr"/>
                    </div>
                    <#if messagesPerField.existsError('username')>
                        <span id="input-error-username" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('username'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg('doSubmit')}"/>
            </div>

            <div class="forgot-password-back-link">
                <a href="${url.loginUrl}">${msg("backToLogin")}</a>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
