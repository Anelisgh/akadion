<#import "template.ftl" as layout>
<@layout.registrationLayout bodyClass="page-login page-update-password" displayMessage=true; section>
    <#if section = "header">
        ${msg("updatePasswordTitle")}
    <#elseif section = "form">
        <form id="kc-passwd-update-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">
            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="password-new" class="${properties.kcLabelClass!}">${msg("passwordNew")}</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <div class="password-field" dir="ltr">
                        <span class="field-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M8.25 10V7.75a3.75 3.75 0 1 1 7.5 0V10h.5A2.75 2.75 0 0 1 19 12.75v5.5A2.75 2.75 0 0 1 16.25 21h-8.5A2.75 2.75 0 0 1 5 18.25v-5.5A2.75 2.75 0 0 1 7.75 10h.5Zm1.5 0h4.5V7.75a2.25 2.25 0 1 0-4.5 0V10Zm-2 1.5c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25h-8.5Z" fill="currentColor"/></svg>
                        </span>
                        <input type="password" id="password-new" name="password-new" class="${properties.kcInputClass!}" autofocus autocomplete="new-password" aria-invalid="<#if messagesPerField.existsError('password','password-new','password-confirm')>true</#if>" />
                        <button class="password-toggle" type="button" aria-controls="password-new" aria-label="${msg('showPassword')}" data-password-toggle data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                            <span data-password-icon="show">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.04 12a10.94 10.94 0 0 1 19.92 0 10.94 10.94 0 0 1-19.92 0Zm10-4.5A4.5 4.5 0 1 0 16.54 12a4.5 4.5 0 0 0-4.5-4.5Zm0 2A2.5 2.5 0 1 1 9.54 12a2.5 2.5 0 0 1 2.5-2.5Z" fill="currentColor"/></svg>
                            </span>
                            <span class="hidden" data-password-icon="hide">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.27 2 18.73 18.73-1.41 1.41-3.34-3.34A10.83 10.83 0 0 1 12 20.5 10.94 10.94 0 0 1 2.04 12a10.9 10.9 0 0 1 4.18-4.95L1.86 3.41 3.27 2Zm5.88 7.29A3.92 3.92 0 0 0 8.54 12 4.5 4.5 0 0 0 13 16.46c.97 0 1.87-.31 2.6-.84l-1.68-1.68A2.48 2.48 0 0 1 10.06 11l-.91-.91Zm10.68 5.27-3.07-3.07c.45-.87.79-1.71 1.2-2.49A10.84 10.84 0 0 0 12 3.5c-1.53 0-2.98.3-4.32.85l1.68 1.68A8.78 8.78 0 0 1 12 5.5 8.87 8.87 0 0 1 19.83 12c-.36.9-.75 1.76-1.19 2.56ZM12 7.5c2.49 0 4.5 2.01 4.5 4.5 0 .62-.13 1.2-.36 1.73l-1.6-1.6c-.19-1.53-1.41-2.75-2.94-2.94L10 7.86c.53-.23 1.11-.36 1.73-.36Z" fill="currentColor"/></svg>
                            </span>
                        </button>
                    </div>
                    <#if messagesPerField.existsError('password','password-new','password-confirm')>
                        <span id="input-error-password-new" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.getFirstError('password','password-new','password-confirm'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="password-confirm" class="${properties.kcLabelClass!}">${msg("passwordConfirm")}</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <div class="password-field" dir="ltr">
                        <span class="field-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M8.25 10V7.75a3.75 3.75 0 1 1 7.5 0V10h.5A2.75 2.75 0 0 1 19 12.75v5.5A2.75 2.75 0 0 1 16.25 21h-8.5A2.75 2.75 0 0 1 5 18.25v-5.5A2.75 2.75 0 0 1 7.75 10h.5Zm1.5 0h4.5V7.75a2.25 2.25 0 1 0-4.5 0V10Zm-2 1.5c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25h-8.5Z" fill="currentColor"/></svg>
                        </span>
                        <input type="password" id="password-confirm" name="password-confirm" class="${properties.kcInputClass!}" autocomplete="new-password" aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>" />
                        <button class="password-toggle" type="button" aria-controls="password-confirm" aria-label="${msg('showPassword')}" data-password-toggle data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                            <span data-password-icon="show">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.04 12a10.94 10.94 0 0 1 19.92 0 10.94 10.94 0 0 1-19.92 0Zm10-4.5A4.5 4.5 0 1 0 16.54 12a4.5 4.5 0 0 0-4.5-4.5Zm0 2A2.5 2.5 0 1 1 9.54 12a2.5 2.5 0 0 1 2.5-2.5Z" fill="currentColor"/></svg>
                            </span>
                            <span class="hidden" data-password-icon="hide">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.27 2 18.73 18.73-1.41 1.41-3.34-3.34A10.83 10.83 0 0 1 12 20.5 10.94 10.94 0 0 1 2.04 12a10.9 10.9 0 0 1 4.18-4.95L1.86 3.41 3.27 2Zm5.88 7.29A3.92 3.92 0 0 0 8.54 12 4.5 4.5 0 0 0 13 16.46c.97 0 1.87-.31 2.6-.84l-1.68-1.68A2.48 2.48 0 0 1 10.06 11l-.91-.91Zm10.68 5.27-3.07-3.07c.45-.87.79-1.71 1.2-2.49A10.84 10.84 0 0 0 12 3.5c-1.53 0-2.98.3-4.32.85l1.68 1.68A8.78 8.78 0 0 1 12 5.5 8.87 8.87 0 0 1 19.83 12c-.36.9-.75 1.76-1.19 2.56ZM12 7.5c2.49 0 4.5 2.01 4.5 4.5 0 .62-.13 1.2-.36 1.73l-1.6-1.6c-.19-1.53-1.41-2.75-2.94-2.94L10 7.86c.53-.23 1.11-.36 1.73-.36Z" fill="currentColor"/></svg>
                            </span>
                        </button>
                    </div>
                    <#if messagesPerField.existsError('password-confirm')>
                        <span id="input-error-password-confirm" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.getFirstError('password-confirm'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <div class="update-password-options">
                <label class="checkbox-row" for="logout-sessions">
                    <input id="logout-sessions" name="logout-sessions" type="checkbox" class="checkbox-input" checked />
                    <span>${msg("logoutOtherSessions")}</span>
                </label>
            </div>

            <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg('updatePasswordSubmit')}" />
                <#if isAppInitiatedAction??>
                    <button class="${properties.kcButtonClass!} update-password-cancel" type="submit" name="cancel-aia" value="true">${msg("doCancel")}</button>
                </#if>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>
