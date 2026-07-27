<#macro termsAcceptance>
    <#if termsAcceptanceRequired??>
        <div class="${properties.kcFormGroupClass!}">
            <div class="${properties.kcInputWrapperClass!}">
                <p class="field-help-heading">${msg("termsTitle")}</p>
                <div id="kc-registration-terms-text" class="field-help-copy">
                    ${kcSanitize(msg("termsText"))?no_esc}
                </div>
            </div>
        </div>
        <div class="${properties.kcFormGroupClass!}">
            <div class="${properties.kcLabelWrapperClass!}">
                <label class="checkbox-row" for="termsAccepted">
                    <input type="checkbox" id="termsAccepted" name="termsAccepted" class="checkbox-input" aria-invalid="<#if messagesPerField.existsError('termsAccepted')>true</#if>" />
                    <span>${msg("acceptTerms")}</span>
                </label>
            </div>
            <#if messagesPerField.existsError('termsAccepted')>
                <div class="${properties.kcLabelWrapperClass!}">
                    <span id="input-error-terms-accepted" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                        ${kcSanitize(messagesPerField.get('termsAccepted'))?no_esc}
                    </span>
                </div>
            </#if>
        </div>
    </#if>
</#macro>
