<#import "template.ftl" as layout>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "register-commons.ftl" as registerCommons>
<@layout.registrationLayout bodyClass="page-register" displayMessage=messagesPerField.exists('global') displayInfo=false displayRequiredFields=true; section>
    <#if section = "header">
        <#if messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${msg("registerTitle")}
        </#if>
    <#elseif section = "preFormCard">
        <div class="progress-stepper" aria-label="${msg('registerProgressLabel')}">
            <div class="progress-stepper__item progress-stepper__item--current">
                <div class="progress-stepper__badge">1</div>
                <div class="progress-stepper__copy">
                    <span class="progress-stepper__label">${msg("registerStepOneLabel")}</span>
                    <span class="progress-stepper__state">${msg("registerStepOneTitle")}</span>
                </div>
            </div>
            <div class="progress-stepper__connector" aria-hidden="true"></div>
            <div class="progress-stepper__item progress-stepper__item--upcoming">
                <div class="progress-stepper__badge">2</div>
                <div class="progress-stepper__copy">
                    <span class="progress-stepper__label">${msg("registerStepTwoLabel")}</span>
                    <span class="progress-stepper__state">${msg("registerStepTwoTitle")}</span>
                </div>
            </div>
        </div>
    <#elseif section = "form">
        <div class="inline-alert inline-alert--info">
            <span class="inline-alert__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2.75a9.25 9.25 0 1 0 9.25 9.25A9.26 9.26 0 0 0 12 2.75Zm0 17a7.75 7.75 0 1 1 7.75-7.75A7.76 7.76 0 0 1 12 19.75Zm0-11.5a1 1 0 1 0 1 1 1 1 0 0 0-1-1Zm.75 3.5h-1.5v5h1.5v-5Z" fill="currentColor"/></svg>
            </span>
            <p class="form-intro">${msg("registerApprovalNotice")}</p>
        </div>

        <#assign hasEmailField = false>
        <#list profile.attributes as attribute>
            <#if attribute.name == 'email'>
                <#assign hasEmailField = true>
            </#if>
        </#list>
        <#assign passwordFieldsRendered = false>

        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post">
            <div class="register-grid">
                <@userProfileCommons.userProfileFormFields; callback, attribute>
                    <#if callback = "afterField">
                        <#if passwordRequired?? && !passwordFieldsRendered && ((hasEmailField && attribute.name == 'email') || (!hasEmailField && attribute.name == 'username'))>
                            <#assign passwordFieldsRendered = true>
                            <div class="${properties.kcFormGroupClass!}">
                                <div class="${properties.kcLabelWrapperClass!}">
                                    <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
                                    <span class="required">*</span>
                                </div>
                                <div class="${properties.kcInputWrapperClass!}">
                                    <div class="password-field" dir="ltr">
                                        <span class="field-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none"><path d="M8.25 10V7.75a3.75 3.75 0 1 1 7.5 0V10h.5A2.75 2.75 0 0 1 19 12.75v5.5A2.75 2.75 0 0 1 16.25 21h-8.5A2.75 2.75 0 0 1 5 18.25v-5.5A2.75 2.75 0 0 1 7.75 10h.5Zm1.5 0h4.5V7.75a2.25 2.25 0 1 0-4.5 0V10Zm-2 1.5c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25h-8.5Z" fill="currentColor"/></svg>
                                        </span>
                                        <input type="password" id="password" class="${properties.kcInputClass!}" name="password" autocomplete="new-password" aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>" />
                                        <button class="password-toggle" type="button" aria-controls="password" aria-label="${msg('showPassword')}" data-password-toggle data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                            <span data-password-icon="show">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.04 12a10.94 10.94 0 0 1 19.92 0 10.94 10.94 0 0 1-19.92 0Zm10-4.5A4.5 4.5 0 1 0 16.54 12a4.5 4.5 0 0 0-4.5-4.5Zm0 2A2.5 2.5 0 1 1 9.54 12a2.5 2.5 0 0 1 2.5-2.5Z" fill="currentColor"/></svg>
                                            </span>
                                            <span class="hidden" data-password-icon="hide">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.27 2 18.73 18.73-1.41 1.41-3.34-3.34A10.83 10.83 0 0 1 12 20.5 10.94 10.94 0 0 1 2.04 12a10.9 10.9 0 0 1 4.18-4.95L1.86 3.41 3.27 2Zm5.88 7.29A3.92 3.92 0 0 0 8.54 12 4.5 4.5 0 0 0 13 16.46c.97 0 1.87-.31 2.6-.84l-1.68-1.68A2.48 2.48 0 0 1 10.06 11l-.91-.91Zm10.68 5.27-3.07-3.07c.45-.87.79-1.71 1.2-2.49A10.84 10.84 0 0 0 12 3.5c-1.53 0-2.98.3-4.32.85l1.68 1.68A8.78 8.78 0 0 1 12 5.5 8.87 8.87 0 0 1 19.83 12c-.36.9-.75 1.76-1.19 2.56ZM12 7.5c2.49 0 4.5 2.01 4.5 4.5 0 .62-.13 1.2-.36 1.73l-1.6-1.6c-.19-1.53-1.41-2.75-2.94-2.94L10 7.86c.53-.23 1.11-.36 1.73-.36Z" fill="currentColor"/></svg>
                                            </span>
                                        </button>
                                    </div>
                                    <#if messagesPerField.existsError('password','password-confirm')>
                                        <span id="input-error-password" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                            ${kcSanitize(messagesPerField.getFirstError('password','password-confirm'))?no_esc}
                                        </span>
                                    </#if>
                                </div>
                            </div>

                            <div class="${properties.kcFormGroupClass!}">
                                <div class="${properties.kcLabelWrapperClass!}">
                                    <label for="password-confirm" class="${properties.kcLabelClass!}">${msg("passwordConfirm")}</label>
                                    <span class="required">*</span>
                                </div>
                                <div class="${properties.kcInputWrapperClass!}">
                                    <div class="password-field" dir="ltr">
                                        <span class="field-icon" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none"><path d="M8.25 10V7.75a3.75 3.75 0 1 1 7.5 0V10h.5A2.75 2.75 0 0 1 19 12.75v5.5A2.75 2.75 0 0 1 16.25 21h-8.5A2.75 2.75 0 0 1 5 18.25v-5.5A2.75 2.75 0 0 1 7.75 10h.5Zm1.5 0h4.5V7.75a2.25 2.25 0 1 0-4.5 0V10Zm-2 1.5c-.69 0-1.25.56-1.25 1.25v5.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-5.5c0-.69-.56-1.25-1.25-1.25h-8.5Z" fill="currentColor"/></svg>
                                        </span>
                                        <input type="password" id="password-confirm" class="${properties.kcInputClass!}" name="password-confirm" autocomplete="new-password" aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>" />
                                        <button class="password-toggle" type="button" aria-controls="password-confirm" aria-label="${msg('showPassword')}" data-password-toggle data-label-show="${msg('showPassword')}" data-label-hide="${msg('hidePassword')}">
                                            <span data-password-icon="show">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.04 12a10.94 10.94 0 0 1 19.92 0 10.94 10.94 0 0 1-19.92 0Zm10-4.5A4.5 4.5 0 1 0 16.54 12a4.5 4.5 0 0 0-4.5-4.5Zm0 2A2.5 2.5 0 1 1 9.54 12a2.5 2.5 0 0 1 2.5-2.5Z" fill="currentColor"/></svg>
                                            </span>
                                            <span class="hidden" data-password-icon="hide">
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.27 2 18.73 18.73-1.41 1.41-3.34-3.34A10.83 10.83 0 0 1 12 20.5 10.94 10.94 0 0 1 2.04 12a10.9 10.9 0 0 1 4.18-4.95L1.86 3.41 3.27 2Zm5.88 7.29A3.92 3.92 0 0 0 8.54 12 4.5 4.5 0 0 0 13 16.46c.97 0 1.87-.31 2.6-.84l-1.68-1.68A2.48 2.48 0 0 1 10.06 11l-.91-.91Zm10.68 5.27-3.07-3.07c.45-.87.79-1.71 1.2-2.49A10.84 10.84 0 0 0 12 3.5c-1.53 0-2.98.3-4.32.85l1.68 1.68A8.78 8.78 0 0 1 12 5.5 8.87 8.87 0 0 1 19.83 12c-.36.9-.75 1.76-1.19 2.56ZM12 7.5c2.49 0 4.5 2.01 4.5 4.5 0 .62-.13 1.2-.36 1.73l-1.6-1.6c-.19-1.53-1.41-2.75-2.94-2.94L10 7.86c.53-.23 1.11-.36 1.73-.36Z" fill="currentColor"/></svg>
                                            </span>
                                        </button>
                                    </div>
                                    <#if messagesPerField.existsError('password','password-confirm')>
                                        <span id="input-error-password-confirm" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                            ${kcSanitize(messagesPerField.getFirstError('password-confirm','password'))?no_esc}
                                        </span>
                                    </#if>
                                </div>
                            </div>
                        </#if>
                    </#if>
                </@userProfileCommons.userProfileFormFields>
            </div>

            <@registerCommons.termsAcceptance />

            <#if recaptchaRequired?? && (recaptchaVisible!false)>
                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}" data-action="${recaptchaAction}"></div>
                    </div>
                </div>
            </#if>

            <div class="${properties.kcFormGroupClass!}">
                <div id="kc-form-options" class="${properties.kcFormOptionsClass!}">
                </div>

                <#if recaptchaRequired?? && !(recaptchaVisible!false)>
                    <script>
                        function onSubmitRecaptcha(token) {
                            document.getElementById("kc-register-form").requestSubmit();
                        }
                    </script>
                    <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                        <button class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!} g-recaptcha" data-sitekey="${recaptchaSiteKey}" data-callback='onSubmitRecaptcha' data-action='${recaptchaAction}' type="submit">
                            ${msg("doRegister")}
                        </button>
                    </div>
                <#else>
                    <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                        <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg('doRegister')}"/>
                    </div>
                </#if>
            </div>

            <p class="auth-switch-copy">${msg("haveAccount")} <a href="${url.loginUrl}">${msg("loginActionText")}</a></p>
        </form>
    </#if>
</@layout.registrationLayout>
